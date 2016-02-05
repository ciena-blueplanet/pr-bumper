'use strict'

require('./typedefs')

const __ = require('lodash')
const Promise = require('promise')
const cpExec = require('child_process').exec
const fetch = require('node-fetch')
const exec = Promise.denodeify(cpExec)

/**
 * Get fetch options
 * @returns {Object} the options
 */
function getFetchOpts () {
  return {
    headers: {
      'user-agent': 'ciena-frost',
      Authorization: `token ${process.env.GITHUB_TOKEN}`
    }
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
   * Use the GitHub API to fetch the open PR for the given sha
   *
   * @param {String} sha - the merge commit SHA for the PR
   * @returns {PrPromise} a promise resolved with the the PullRequest
   */
  getOpenPrForSha (sha) {
    const owner = this.config.owner
    const repo = this.config.repo

    return new Promise((resolve, reject) => {
      fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, getFetchOpts())
        .then((resp) => resp.json())
        .then((json) => {
          const ghPr = __.find(json, {'merge_commit_sha': sha})
          if (!ghPr) {
            reject(`No PR found for sha [${sha}]`)
          } else {
            const pr = {
              number: ghPr.number,
              description: ghPr.body,
              url: ghPr.html_url,
              mergeCommitSha: ghPr.merge_commit_sha,
              headSha: ghPr.head.sha
            }
            resolve(pr)
          }
        })
        .catch((err) => {
          reject(err)
        })
    })
  }

  /**
   * Use the GitHub API to fetch the closed PR for the given sha
   *
   * @param {String} sha - the head commit SHA for the branch that was merged
   * @returns {PrPromise} a promise resolved with the the PullRequest
   */
  getClosedPrForSha (sha) {
    const owner = this.config.owner
    const repo = this.config.repo

    return new Promise((resolve, reject) => {
      fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=closed`, getFetchOpts())
        .then((resp) => resp.json())
        .then((json) => {
          const ghPr = __.find(json, (pr) => {
            return (__.get(pr, 'head.sha') === sha)
          })

          if (!ghPr) {
            reject(`No PR found for sha [${sha}]`)
          } else {
            const pr = {
              number: ghPr.number,
              description: ghPr.body,
              url: ghPr.html_url,
              mergeCommitSha: ghPr.merge_commit_sha,
              headSha: ghPr.head.sha
            }
            resolve(pr)
          }
        })
        .catch((err) => {
          reject(err)
        })
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
        return exec(`git push my-origin my-master:refs/heads/master --tags`)
      })
  }
}

module.exports = GitHub
