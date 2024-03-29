const debug = require('debug')('slash-command-template:task')
const message = require('./message')
const users = require('./users')

/*
 *  Create a new task
 */
const create = (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body
  // create the dialog payload - includes the dialog structure, Slack API token,
  // and trigger ID
  const dialog = {
    token: process.env.SLACK_ACCESS_TOKEN,
    trigger_id,
    dialog: JSON.stringify({
      title: 'Submit a new task',
      callback_id: 'submitTask',
      submit_label: 'Submit',
      elements: [
        {
          label: 'Title',
          type: 'text',
          name: 'title',
          value: text,
          hint: '10 second summary of the problem'
        },
        {
          label: 'Assign to',
          name: 'assignee',
          type: 'select',
          data_source: 'users'
        },
        {
          label: 'Description',
          type: 'textarea',
          name: 'description',
          optional: true
        },
        {
          label: 'Urgency',
          type: 'select',
          name: 'urgency',
          options: [
            { label: 'Low', value: 'Low' },
            { label: 'Medium', value: 'Medium' },
            { label: 'High', value: 'High' }
          ]
        }
      ]
    })
  }

  // open the dialog by calling dialog.open method and sending the payload
  message.openDialog(dialog, res)
}

/*
 *  Send task creation confirmation via
 *  chat.postMessage to the user who created it
 */
const sendConfirmation = (task) => {
  const msg = {
    title: `New task created by ${task.author}`,
    // Get this from github issues
    title_link: 'https://github.com',
    text: task.text,
    fields: [
      {
        title: 'Title',
        value: task.title
      },
      {
        title: 'Description',
        value: task.description || 'None provided'
      },
      {
        title: 'Urgency',
        value: task.urgency,
        short: true
      },
      {
        title: 'Assigned to',
        value: task.assignee,
        short: true
      }
    ]
  }
  message.postMessage(task.channelId, msg)
}

// Finish creating task. Call users.find to get the user's email address
// from their user ID
const finish = (userId, body) => {
  const task = {}
  const fetchUserName = new Promise((resolve, reject) => {
    users.find(body.submission.assignee).then((result) => {
      debug(`Find user: ${userId}`)
      const username = result.data.user.profile.real_name || result.data.user.profile.display_name
      resolve(username)
    }).catch((err) => { reject(err) })
  })
  console.log(body.user)
  fetchUserName.then((result) => {
    task.userId = userId
    task.channelId = body.channel.id
    task.author = body.user.name
    task.title = body.submission.title
    task.description = body.submission.description
    task.urgency = body.submission.urgency
    task.assignee = result
    sendConfirmation(task)

    return task
  }).catch((err) => { console.error(err) })
}

module.exports = { create, finish, sendConfirmation }
