const debug = require('debug')('slash-command-template:task')
const message = require('./message')
const users = require('./users')
const utils = require('./utils')

// temp
let proposals = []

/*
 *  Create a new proposal
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
      title: 'Submit a new proposal',
      callback_id: 'submitProposal',
      submit_label: 'Submit',
      elements: [
        {
          label: 'Title',
          type: 'text',
          name: 'title',
          value: text,
          hint: '10 second summary of the proposal'
        },
        {
          label: 'Description',
          type: 'textarea',
          name: 'description',
          optional: true
        }
      ]
    })
  }
  // open the dialog by calling dialog.open method and sending the payload
  message.openDialog(dialog, res)
}

/*
 *  List existing proposals
 */
const list = (req, res) => {
  let listOfProposals = []
  proposals.forEach(proposal => {
    listOfProposals.push({
      title: `${proposal.title} by ${proposal.author} -- ${proposal.id}`,
      value: proposal.description
    })
  })
  const msg = {
    title: `List of proposals`,
    // Get this from github issues
    title_link: 'https://github.com',
    fields: listOfProposals
  }
  message.postMessage(req.body.channel_id, msg, res)
}

/*
 *  List one proposal by id
 */
const lookupID = (req, res) => {
  // find the right proposal by its ID
  const { text, channel_id } = req.body
  const proposal = proposals.filter(proposal => proposal.id === text)[0]
  if (!proposal || !proposal.id) {
    const msg = {
      title: `I'm sorry, no proposal matches ID: ${text}`
    }
    message.postMessage(channel_id, msg, res)
    return
  }

  const msg = {
    title: `Details for proposal having ID: ${proposal.id}`,
    // Get this from github issues
    title_link: 'https://github.com',
    fields: [
      {
        title: 'Title',
        value: proposal.description
      },
      {
        title: 'Author',
        value: proposal.author
      },
      {
        title: 'Created',
        value: new Date(proposal.ts).toLocaleString()
      },
      {
        title: 'Description',
        value: proposal.description
      }
    ]
  }
  message.postMessage(channel_id, msg, res)
}

/*
 *  Send proposal creation confirmation via
 *  chat.postMessage to the user who created it
 */
const sendConfirmation = (proposal) => {
  const msg = {
    title: `New proposal created by ${proposal.author}`,
    // Get this from github issues
    title_link: 'https://github.com',
    text: proposal.text,
    fields: [
      {
        title: 'Title',
        value: proposal.title
      },
      {
        title: 'Description',
        value: proposal.description || 'None provided'
      }
    ]
  }
  message.postMessage(proposal.channelId, msg)
}

// Finish creating the proposal. Call users.find to get the user's email address
// from their user ID
const finish = (userId, body) => {
  const proposal = {}
  const fetchUserName = new Promise((resolve, reject) => {
    users.find(body.user.id).then((result) => {
      debug(`Find user: ${userId}`)
      const username = result.data.user.profile.real_name || result.data.user.profile.display_name
      resolve(username)
    }).catch((err) => { reject(err) })
  })
  fetchUserName.then((result) => {
    proposal.userId = userId
    proposal.channelId = body.channel.id
    proposal.title = body.submission.title
    proposal.description = body.submission.description
    proposal.urgency = body.submission.urgency
    proposal.author = result
    sendConfirmation(proposal)

    // TODO: also persist data
    proposal.id = utils.UUID()
    proposal.ts = Date.now()
    proposals.push(proposal)

    return proposal
  }).catch((err) => { console.error(err) })
}

module.exports = { create, list, lookupID, finish, sendConfirmation }
