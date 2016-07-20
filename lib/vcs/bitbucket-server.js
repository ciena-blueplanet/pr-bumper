'use strict'

require('../typedefs')

// not using const to enable rewiring during test
let fetch = require('node-fetch')

const logger = require('../logger')

/**
 * Convert a Bitbucket PR to a PR representation
 * @param {BitbucketPullRequest} bbPr - the API response from a Bitbucket API looking for a PR
 * @returns {PullRequest} a pull request in standard format
 */
function convertPr (bbPr) {
  return {
    description: bbPr.description,
    headSha: bbPr.fromRef.latestCommit,
    number: bbPr.id,
    url: bbPr.links.self[0].href
  }
}

/**
 * VCS interface for Bitbucket Server
 *
 * @class
 * @implements {Vcs}
 */
class BitbucketServer {
  /**
   * @param {Config} config - the configuration object
   */
  constructor (config) {
    this.config = config

    const password = this.config.vcs.auth.password
    const username = this.config.vcs.auth.username
    const domain = this.config.vcs.domain
    this.baseUrl = `https://${username}:${encodeURIComponent(password)}@${domain}/rest/api/1.0`
  }

  /**
   * Sometimes, based on the CI system, one might need to create a git remote to
   * be able to push, this method provides a hook to do just that.
   *
   * @returns {Promise} - a promise resolved with the name of the remote to be used for pushing
   */
  addRemoteForPush () {
    // nothing to do
    return Promise.resolve('origin')
  }

  /**
   * Get the given PR
   * @param {String} prNumber - the PR number (i.e. 31)
   * @returns {PrPromise} a promise resolved with the PR object from the API
   */
  getPr (prNumber) {
    const owner = this.config.owner
    const repo = this.config.repo
    const url = `${this.baseUrl}/projects/${owner}/repos/${repo}/pull-requests/${prNumber}`

    const safeUrl = url.replace(/https:\/\/[^:]+:[^@]+@/, 'https://')
    logger.log(`About to send GET to ${safeUrl}`)

    return fetch(url)
      .then((resp) => {
        if (!resp.ok) {
          throw new Error(`${resp.status}: ${JSON.stringify(resp.json, null, 2)}`)
        }
        return resp.json()
      })
      .then((bbPr) => {
        return convertPr(bbPr)
      })
  }
}

module.exports = BitbucketServer
