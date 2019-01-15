const axios = require('axios')
const debug = require('debug')('slash-command-template:task')
const qs = require('querystring')
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
  axios.post(`${process.env.API_URL}/dialog.open`, qs.stringify(dialog))
    .then((result) => {
      debug('dialog.open: %o', result.data)
      res.send('')
    }).catch((err) => {
      debug('dialog.open call failed: %o', err)
      res.sendStatus(500)
    })
}

/*
 *  List existing proposals
 */
const list = (req, res) => {
  let listOfProposals = []
  proposals.forEach(proposal => {
    listOfProposals.push({
      title: `${proposal.title} - ${proposal.author}`,
      value: proposal.description
    })
  })
  axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
    token: process.env.SLACK_ACCESS_TOKEN,
    channel: req.body.channel_id,
    as_user: true,
    attachments: JSON.stringify([
      {
        title: `List of proposals`,
        // Get this from github issues
        title_link: 'https://github.com',
        fields: listOfProposals
      }
    ])
  })).then((result) => {
    debug('sendConfirmation: %o', result.data)
    res.send('')
  }).catch((err) => {
    debug('sendConfirmation error: %o', err)
    console.error(err)
    res.sendStatus(500)
  })
}

/*
 *  Send proposal creation confirmation via
 *  chat.postMessage to the user who created it
 */
const sendConfirmation = (proposal) => {
  axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
    token: process.env.SLACK_ACCESS_TOKEN,
    channel: proposal.channelId,
    as_user: true,
    attachments: JSON.stringify([
      {
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
    ])
  })).then((result) => {
    debug('sendConfirmation: %o', result.data)
  }).catch((err) => {
    debug('sendConfirmation error: %o', err)
    console.error(err)
  })
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
    proposals.push(proposal)

    return proposal
  }).catch((err) => { console.error(err) })
}

module.exports = { create, list, finish, sendConfirmation }
