'use strict'

require('./typedefs')

const __ = require('lodash')
const github = require('github-basic')
const client = github({version: 3})

/**
 * VCS interface for public GitHub (github.com)
 *
 * @class
 * @implements {Vcs}
 */
class GitHub {
  /**
   * @param {String} owner - user/org owner of repo
   * @param {String} repo - repo name
   */
  constructor (owner, repo) {
    this.owner = owner
    this.repo = repo
  }

  /**
   * Use the GitHub API to fetch the open PR for the given sha
   *
   * @param {String} sha - the merge commit SHA for the PR
   * @returns {PrPromise} a promise resolved with the the PullRequest
   */
  getOpenPrForSha (sha) {
    const repoOwner = this.owner
    const repoName = this.repo

    return new Promise((resolve, reject) => {
      client.get('/repos/:owner/:repo/pulls', {repoOwner, repoName}, (err, res) => {
        if (err) {
          reject(err)
        } else {
          const ghPr = __.find(res, {'merge_commit_sha': sha})
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
        }
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
    const repoOwner = this.owner
    const repoName = this.repo

    return new Promise((resolve, reject) => {
      client.get('/repos/:owner/:repo/pulls?state=closed', {repoOwner, repoName}, (err, res) => {
        if (err) {
          reject(err)
        } else {
          const ghPr = __.find(res, (pr) => {
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
        }
      })
    })
  }
}

module.exports = GitHub
