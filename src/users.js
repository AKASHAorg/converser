const qs = require('querystring')
const axios = require('axios')

const find = (slackUserId) => {
  const body = { token: process.env.SLACK_ACCESS_TOKEN, user: slackUserId }
  const promise = axios.post('https://slack.com/api/users.info', qs.stringify(body))
  return promise
}

const list = () => {
  const body = { token: process.env.SLACK_ACCESS_TOKEN }
  const promise = axios.post('https://slack.com/api/users.list', qs.stringify(body))
  return promise
}

module.exports = { find, list }
