'use strict'

require('./typedefs')

const __ = require('lodash')
const github = require('github-basic')
const Promise = require('promise')
const cpExec = require('child_process').exec

const client = github({version: 3})
const exec = Promise.denodeify(cpExec)

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
    const owner = this.owner
    const repo = this.repo

    return new Promise((resolve, reject) => {
      client.get('/repos/:owner/:repo/pulls', {owner, repo}, (err, res) => {
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

  /**
   * Tag the most recent commit with the given tag
   * @param {String} name - the name of the tag to add
   */
  tagCommit (name) {
    // TODO: make this more configurable
    const buildNumber = process.env.TRAVIS_BUILD_NUMBER
    const githubToken = process.env.GITHUB_TOKEN

    const owner = this.owner
    const repo = this.repo

    exec('git config --global user.email "builds@travis-ci.com"')
      .then(() => {
        return exec('git config --global user.name "Travis CI"')
      })
      .then(() => {
        return exec(`git tag ${name} -a -m "Generated tag from CI build ${buildNumber}"`)
      })
      .then(() => {
        return exec(`git push -q https://${githubToken}@github.com/${owner}/${repo} --tags`)
      })
  }

  /**
   * Push local changes to GitHub
   * @returns {Promise} a promise resolved with the result of the push
   */
  push () {
    // TODO: make this more configurable
    const githubToken = process.env.GITHUB_TOKEN

    const owner = this.owner
    const repo = this.repo
    return exec(`git push -q https://${githubToken}@github.com/${owner}/${repo} --tags`)
  }
}

module.exports = GitHub
