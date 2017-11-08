/**
 * @flow
 */

import fetch, {type Response} from 'node-fetch'
import nullthrows from 'nullthrows'

import {exec} from '../child_process'
import logger from '../logger'
import type {Config, GitHubPullRequest, PullRequest} from '../typedefs'

/**
 * Get fetch headers
 * @param {Config} config - the pr-bumper config object
 * @returns {Object} the headers
 */
function getHeaders (config: Config): {[name: string]: string} {
  const headers = {}
  const readToken = config.computed.vcs.auth.readToken

  logger.log(`RO_GH_TOKEN = [${readToken || ''}]`)

  if (readToken) {
    headers.Authorization = `token ${readToken}`
  }

  return headers
}

/**
 * Convert a GitHub PR to a PR representation
 * @param {GitHubPullRequest} ghPr - the API response from a GitHub API looking for a PR
 * @returns {PullRequest} a pull request in standard format
 */
function convertPr (ghPr: GitHubPullRequest): PullRequest {
  return {
    description: ghPr.body,
    headSha: ghPr.head.sha,
    number: ghPr.number,
    url: ghPr.html_url
  }
}

/**
 * VCS interface for public GitHub (github.com)
 *
 * @class
 * @implements {Vcs}
 */
export default class GitHub {
  config: Config

  /**
   * @param {Config} config - the configuration object
   */
  constructor (config: Config): void {
    this.config = config
  }

  /**
   * Sometimes, based on the CI system, one might need to create a git remote to
   * be able to push, this method provides a hook to do just that.
   *
   * @returns {Promise} - a promise resolved with the name of the remote to be used for pushing
   */
  addRemoteForPush (): Promise<string> {
    const ghToken = nullthrows(this.config.computed.vcs.auth.writeToken)
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
  getPr (prNumber: string): Promise<PullRequest> {
    const owner = this.config.vcs.repository.owner
    const repo = this.config.vcs.repository.name
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`

    logger.log(`About to send GET to ${url}`)

    return fetch(url, {headers: getHeaders(this.config)})
      .then((resp: Response) => {
        if (!resp.ok) {
          return resp.json().then((json: *) => {
            throw new Error(`${resp.status}: ${JSON.stringify(json)}`)
          })
        }
        return resp.json()
      })
      .then((ghPr: GitHubPullRequest) => {
        return convertPr(ghPr)
      })
  }

  /**
   * Post a comment to the given PR
   * @param {String} prNumber - the PR number (i.e. 31)
   * @param {String} comment - the comment body
   * @returns {Promise} a promise resolved with result of posting the comment
   */
  postComment (prNumber: string, comment: string): Promise<*> {
    const owner = this.config.vcs.repository.owner
    const repo = this.config.vcs.repository.name
    const url = `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`
    logger.log(`About to send POST to ${url}`)

    return fetch(url, {
      body: JSON.stringify({body: comment}),
      headers: ['Content-Type', 'application/json'],
      method: 'POST'
    })
      .then((resp: Response) => {
        if (!resp.ok) {
          return resp.json().then((json: *) => {
            throw new Error(`${resp.status}: ${JSON.stringify(json)}`)
          })
        }
      })
  }
}
