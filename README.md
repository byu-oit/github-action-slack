![Build](https://github.com/byu-oit/github-action-slack/workflows/Build/badge.svg)
![Test](https://github.com/byu-oit/github-action-slack/workflows/Test/badge.svg)

# ![BYU logo](https://www.hscripts.com/freeimages/logos/university-logos/byu/byu-logo-clipart-128.gif) github-action-slack
A GitHub Action for sending Slack notifications

Sends messages that look like:

<img src="https://github.com/byu-oit/github-action-slack/blob/master/push.png" width="500">

<img src="https://github.com/byu-oit/github-action-slack/blob/master/pr.png" width="500">

## Setup
Your Slack workplace will need a <img src="https://github.com/byu-oit/github-action-slack/blob/master/cancel.png" width="16" height="16"> (`:cancel:`) emoji. We've provided one in this repo.

Then, all you'll need is a webhook URL and a channel that you want to post to.

## Usage

This is for workflows that run on `push` or `pull_request`

```yaml
on: push
# ...
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      # ...
      - name: Slack
        uses: byu-oit/github-action-slack@v1
        if: always()
        with:
          status: ${{ job.status }}
          # You need the quotes (''), otherwise it gets interpreted as a comment
          channel: '#slack-bot-testing'
          webhook-url: ${{ secrets.slack_webhook_url }}
```

## Contributing
Hopefully this is useful to others at BYU. Feel free to ask me some questions about it, but I make no promises about being able to commit time to support it.

### Modifying Source Code

Just run `npm install` locally. There aren't many files here, so hopefully it should be pretty straightforward.

### Cutting new releases

GitHub Actions will run the entry point from the `action.yml`. In our case, that happens to be `/dist/index.js`.

Actions run from GitHub repos. We don't want to check in `node_modules`. Hence, we package the app using `npm run package`.

Then, be sure to create a new GitHub release, following SemVer.
