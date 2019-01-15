const axios = require('axios')
const debug = require('debug')('slash-command-template:task')
const qs = require('querystring')

const postMessage = (channelID, message, res) => {
  axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
    token: process.env.SLACK_ACCESS_TOKEN,
    channel: channelID,
    as_user: true,
    attachments: JSON.stringify([message])
  })).then((result) => {
    debug('sendConfirmation: %o', result.data)
    if (res) {
      res.send('')
    }
  }).catch((err) => {
    debug('sendConfirmation error: %o', err)
    console.error(err)
    if (res) {
      res.sendStatus(500)
    }
  })
}

const openDialog = (dialog, res) => {
  // open the dialog by calling dialog.open method and sending the payload
  axios.post(`${process.env.API_URL}/dialog.open`, qs.stringify(dialog)).then((result) => {
    debug('dialog.open: %o', result.data)
    if (res) {
      res.send('')
    }
  }).catch((err) => {
    debug('dialog.open call failed: %o', err)
    if (res) {
      res.sendStatus(500)
    }
  })
}

module.exports = { postMessage, openDialog }
