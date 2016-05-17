'use strict'

require('./typedefs')

const Promise = require('promise')
const cpExec = require('child_process').exec

// These two are not `const` so they can be re-wired during tests
let fetch = require('node-fetch')
let exec = Promise.denodeify(cpExec)

const logger = require('./logger')

/**
 * Get VCS info from the config
 * @param {Config} config = the configuration object
 * @returns {Object} the info
 */
function getFetchOpts (config) {
  const headers = {}
  logger.log(`RO_GH_TOKEN = [${process.env.RO_GH_TOKEN}]`)
  if (process.env.RO_GH_TOKEN) {
    headers['Authorization'] = `token ${process.env.RO_GH_TOKEN}`
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
    mergeCommitSha: ghPr.merge_commit_sha,
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
    this.domain = config.domain
    this.username = process.env[config.bitbucket.usernameEnv]
    this.password = process.env[config.bitbucket.passwordEnv]
  }

  /**
   * Get the given PR
   * @param {String} pr - the PR number (i.e. 31)
   * @returns {Promise} a promise resolved with the PR object from the API
   */
  getPr (pr) {
    const owner = this.config.owner
    const repo = this.config.repo
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pr}`

    if (process.env.VERBOSE) {
      logger.log(`About to send GET to ${url}`)
    }

    return fetch(url, getFetchOpts())
      .then((resp) => {
        if (!resp.ok) {
          throw new Error(`${resp.status}: ${JSON.stringify(resp.json, null, 2)}`)
        }
        return resp.json()
      })
      .then((ghPr) => {
        return convertPr(ghPr)
      })
  }

  /**
   * Push local changes to GitHub
   * @returns {Promise} a promise resolved with the result of the push
   */
  push () {
    const ghToken = process.env.GITHUB_TOKEN
    const config = this.config

    // TODO: find a safer way to do this, as the token can be displayed if a bug
    // is introduced here and exec errors out.
    return exec(`git remote add my-origin https://${ghToken}@github.com/${config.owner}/${config.repo}`)
      .then(() => {
        return exec('git push my-origin my-master:refs/heads/master --tags')
      })
  }
}

module.exports = GitHub
