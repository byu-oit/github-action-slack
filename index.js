const { getInput, setFailed } = require('@actions/core')
const github = require('@actions/github')
const request = require('request-promise')

function getStatusEmoji (status) {
  switch (status) {
    case 'success': return ':heavy_check_mark:'
    case 'failure': return ':x:'
    case 'neutral': return ':black_medium_square:'
    case 'cancelled': return ':cancel:' // A custom emoji, included in this repo as cancel.png
    case 'skipped': return ':cancel:'
    case 'timed_out': return ':x:'
    case 'action_required': return ':exclamation:'
    default: return ':black_medium_square:'
  }
}

function getStatusText (status) {
  switch (status) {
    case 'success': return 'was *successful*!'
    case 'failure': return '*failed*!'
    case 'neutral': return 'finished.'
    case 'cancelled': return 'was *cancelled*!'
    case 'skipped': return 'was *skipped*!'
    case 'timed_out': return '*timed out*!'
    case 'action_required': return '*requires action*!'
    default: return 'finished.'
  }
}

const green = '#2ea350'
const red = '#d40200'
const yellow = '#e09c31'
const gray = '#808080'
function getStatusColor (status) {
  switch (status) {
    case 'success': return green
    case 'failure': return red
    case 'neutral': return gray
    case 'cancelled': return gray
    case 'skipped': return gray
    case 'timed_out': return red
    case 'action_required': return yellow
    default: return gray
  }
}

// https://api.slack.com/reference/surfaces/formatting#escaping
const ampRegex = /&/g
const ltRegex = /</g
const gtRegex = />/g
function escapeForSlack (string) {
  return string.replace(ampRegex, '&amp;').replace(ltRegex, '&lt;').replace(gtRegex, '&gt;')
}

const asteriskRegex = /\*/g
function removeAsterisks (string) {
  return string.replace(asteriskRegex, '')
}

async function getFullName (githubUsername) {
  try {
    const { name } = await request({
      method: 'GET',
      uri: `https://api.github.com/users/${githubUsername}`,
      json: true,
      headers: { 'User-Agent': 'byu-oit/github-action-slack' } // GitHub requires a User-Agent, even if it's bogus
    })
    return name || '?'
  } catch (e) {
    return '?'
  }
}

async function run () {
  try {
    const { context: { eventName } } = github
    if (eventName !== 'push' && eventName !== 'pull_request') {
      throw Error('Events other than `push` and `pull_request` are not supported.')
    }

    const status = getInput('status', { required: true })
    const channel = getInput('channel', { required: true })
    const webhookUrl = getInput('webhook-url', { required: true })

    const {
      context: {
        sha,
        workflow,
        actor: githubUsername,
        payload: {
          action, // Activity Type from https://help.github.com/en/actions/reference/events-that-trigger-workflows#pull-request-event-pull_request
          ref,
          head_commit: {
            message: headCommitMessage
          } = {},
          repository: {
            full_name: repoName
          },
          pull_request: {
            number: pullRequestNumber,
            title
          } = {}
        }
      }
    } = github
    const branch = (eventName === 'push')
      ? ref.slice('refs/heads/'.length) // ref = 'refs/heads/master'
      : github.context.payload.pull_request.head.ref // 'master'
    const runNumber = process.env.GITHUB_RUN_NUMBER
    const runId = process.env.GITHUB_RUN_ID

    const message = (eventName === 'push')
      ? headCommitMessage.split('\n')[0]
      : title

    const fullName = await getFullName(githubUsername)

    const boldableWorkflow = removeAsterisks(workflow)
    const boldableRepoAndBranch = removeAsterisks(`${repoName}@${branch}`)
    const eventMessage = (eventName === 'push')
      ? `Commit <https://github.com/${repoName}/commit/${sha}|${sha.substring(0, 8)}> pushed`
      : `Pull request <https://github.com/${repoName}/pull/${pullRequestNumber}|#${pullRequestNumber}> ${action}`
    const body = {
      channel,
      attachments: [
        {
          color: getStatusColor(status),
          fallback: `The ${escapeForSlack(workflow)} workflow on ${escapeForSlack(repoName)}@${escapeForSlack(branch)} ${getStatusText(status)}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `The *${escapeForSlack(boldableWorkflow)}* workflow on <https://github.com/${repoName}/tree/${branch}|*${escapeForSlack(boldableRepoAndBranch)}*> ${getStatusText(status)}`
              },
              accessory: {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'View Run',
                  emoji: false
                },
                url: `https://github.com/${repoName}/actions/runs/${runId}`
              }
            },
            {
              type: 'divider'
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `${getStatusEmoji(status)} *${escapeForSlack(message)}*`
              }
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `<https://github.com/${repoName}/actions?query=workflow%3A"${encodeURIComponent(workflow)}"|*${escapeForSlack(boldableWorkflow)}*> #${runNumber}: ${eventMessage} by <https://github.com/${githubUsername}|${escapeForSlack(githubUsername)}> (${escapeForSlack(fullName)})`
                }
              ]
            },
            {
              type: 'divider'
            }
          ]
        }
      ]
    }

    await request({
      method: 'POST',
      uri: webhookUrl,
      body,
      json: true
    })
  } catch (e) {
    setFailed(e.message || e)
  }
}

run()
