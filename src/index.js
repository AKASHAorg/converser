require('dotenv').config()

const axios = require('axios')
const express = require('express')
const bodyParser = require('body-parser')
const qs = require('querystring')
const task = require('./task')
const signature = require('./verifySignature')
const debug = require('debug')('slash-command-template:index')

const apiUrl = 'https://slack.com/api'

const app = express()

/*
 * Parse application/x-www-form-urlencoded && application/json
 * Use body-parser's `verify` callback to export a parsed raw body
 * that you need to use to verify the signature
 */

const rawBodyBuffer = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8')
  }
}

app.use(bodyParser.urlencoded({ verify: rawBodyBuffer, extended: true }))
app.use(bodyParser.json({ verify: rawBodyBuffer }))

app.get('/', (req, res) => {
  res.send('<h2>The Slash Command and Dialog app is running</h2> <p>Follow the' +
  ' instructions in the README to configure the Slack App and your environment variables.</p>')
})

/*
 * Endpoint to receive /newtask slash command from Slack.
 * Checks verification token and opens a dialog to capture more info.
 */
app.post('/newtask', (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body
  // Verify the signing secret
  if (signature.isVerified(req)) {
    // create the dialog payload - includes the dialog structure, Slack API token,
    // and trigger ID
    const dialog = {
      token: process.env.SLACK_ACCESS_TOKEN,
      trigger_id,
      dialog: JSON.stringify({
        title: 'Submit a new task',
        callback_id: 'submit-task',
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
    axios.post(`${apiUrl}/dialog.open`, qs.stringify(dialog))
      .then((result) => {
        debug('dialog.open: %o', result.data)
        res.send('')
      }).catch((err) => {
        debug('dialog.open call failed: %o', err)
        res.sendStatus(500)
      })
  } else {
    debug('Verification token mismatch')
    res.sendStatus(404)
  }
})

/*
 * Endpoint to receive the dialog submission. Checks the verification token
 * and creates a task
 */
app.post('/interactive', (req, res) => {
  const body = JSON.parse(req.body.payload)

  // check that the verification token matches expected value
  if (signature.isVerified(req)) {
    debug(`Form submission received: ${body.submission.trigger_id}`)

    // immediately respond with a empty 200 response to let
    // Slack knows the command was received
    res.send('')

    // create task
    task.create(body.user.id, body)
  } else {
    debug('Token mismatch')
    res.sendStatus(404)
  }
})

const server = app.listen(process.env.PORT || 5000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env)
})
