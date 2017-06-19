'use strict'

require('../typedefs')

const Promise = require('promise')
const cpExec = require('child_process').exec

// These two are not `const` so they can be re-wired during tests
let fetch = require('node-fetch')
let exec = Promise.denodeify(cpExec)

const logger = require('../logger')

/**
 * Get fetch options
 * @param {Config} config - the pr-bumper config object
 * @returns {Object} the options
 */
function getFetchOpts (config) {
  const readToken = config.computed.vcs.auth.readToken
  const headers = {}
  logger.log(`RO_GH_TOKEN = [${readToken}]`)
  if (readToken) {
    headers['Authorization'] = `token ${readToken}`
  }
  return {headers}
}

/**
 * Convert a GitHub PR to a PR representation
 * @param {GitHubPullRequest} ghPr - the API response from a GitHub API looking for a PR
 * @returns {PullRequest} a pull request in standard format
 */
function convertPr (ghPr) {
  return {
    number: ghPr.number,
    description: ghPr.body,
    url: ghPr.html_url,
    headSha: ghPr.head.sha
  }
}

/**
 * VCS interface for public GitHub (github.com)
 *
 * @class
 * @implements {Vcs}
 */
class GitHub {
  /**
   * @param {Config} config - the configuration object
   */
  constructor (config) {
    this.config = config
  }

  /**
   * Sometimes, based on the CI system, one might need to create a git remote to
   * be able to push, this method provides a hook to do just that.
   *
   * @returns {Promise} - a promise resolved with the name of the remote to be used for pushing
   */
  addRemoteForPush () {
    const ghToken = this.config.computed.vcs.auth.writeToken
    const owner = this.config.vcs.repository.owner
    const repo = this.config.vcs.repository.name

    logger.log('Adding ci-origin remote')

    // TODO: find a safer way to do this, as the token can be displayed if a bug
    // is introduced here and exec errors out.
    return exec(`git remote add ci-origin https://${ghToken}@github.com/${owner}/${repo}`)
      .then(() => {
        return 'ci-origin'
      })
  }

  /**
   * Get the given PR
   * @param {String} prNumber - the PR number (i.e. 31)
   * @returns {Promise} a promise resolved with the PR object from the API
   */
  getPr (prNumber) {
    const owner = this.config.vcs.repository.owner
    const repo = this.config.vcs.repository.name
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`

    logger.log(`About to send GET to ${url}`)

    return fetch(url, getFetchOpts(this.config))
      .then((resp) => {
        if (!resp.ok) {
          throw new Error(`${resp.status}: ${JSON.stringify(resp.json())}`)
        }
        return resp.json()
      })
      .then((ghPr) => {
        return convertPr(ghPr)
      })
  }

  /**
   * Post a comment to the given PR
   * @param {String} prNumber - the PR number (i.e. 31)
   * @param {String} comment - the comment body
   * @returns {Promise} a promise resolved with result of posting the comment
   */
  postComment (prNumber, comment) {
    const owner = this.config.vcs.repository.owner
    const repo = this.config.vcs.repository.name
    const url = `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`
    logger.log(`About to send POST to ${url}`)

    return fetch(url, {
      method: 'POST',
      body: JSON.stringify({body: comment}),
      headers: {'Content-Type': 'application/json'}
    })
      .then((resp) => {
        if (!resp.ok) {
          throw new Error(`${resp.status}: ${JSON.stringify(resp.json())}`)
        }
      })
  }
}

module.exports = GitHub
