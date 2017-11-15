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
    headSha: bbPr.source.commit.hash,
    number: bbPr.id,
    url: bbPr.links.self.href
  }
}

/**
 * VCS interface for Bitbucket Server
 *
 * @class
 * @implements {Vcs}
 */
class Bitbucket {
  /**
   * @param {Config} config - the configuration object
   */
  constructor (config) {
    this.config = config

    const password = this.config.computed.vcs.auth.password
    const username = this.config.computed.vcs.auth.username
    const domain = this.config.vcs.domain
    const baseUrl = `https://${username}:${encodeURIComponent(password)}@${domain}`
    this.baseUrl1 = `${baseUrl}/1.0` // supports posting comments
    this.baseUrl2 = `${baseUrl}/2.0` // does not support posting comments
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
    const owner = this.config.vcs.repository.owner
    const repo = this.config.vcs.repository.name
    const url = `${this.baseUrl2}/repositories/${owner}/${repo}/pullrequests/${prNumber}`

    const safeUrl = url.replace(/https:\/\/[^:]+:[^@]+@/, 'https://')
    logger.log(`About to send GET to ${safeUrl}`)

    return fetch(url)
      .then((resp) => {
        if (!resp.ok) {
          throw new Error(`${safeUrl} ${resp.status}: ${JSON.stringify(resp.json())}`)
        }
        return resp.json()
      })
      .then((bbPr) => {
        return convertPr(bbPr)
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

    const url = `${this.baseUrl1}/repositories/${owner}/${repo}/pullrequests/${prNumber}/comments`
    const safeUrl = url.replace(/https:\/\/[^:]+:[^@]+@/, 'https://')
    logger.log(`About to send POST to ${safeUrl}`)

    return fetch(url, {
      method: 'POST',
      body: `content=${comment}`
    })
      .then((resp) => {
        if (!resp.ok) {
          throw new Error(`${safeUrl} ${resp.status}: API 1.0 Error`)
        }
      })
  }
}

module.exports = Bitbucket
