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
  const headers = {}
  console.log(`RO_GH_TOKEN = [${process.env.RO_GH_TOKEN}]`)
  if (process.env.RO_GH_TOKEN) {
    headers['Authorization'] = `token ${process.env.RO_GH_TOKEN}`
  }
  return {headers}
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
      const url = `https://api.github.com/repos/${owner}/${repo}/pulls`
      if (process.env.VERBOSE) {
        console.log(`About to send GET to ${url}`)
      }
      fetch(url, getFetchOpts())
        .then((resp) => {
          return resp.json().then((json) => {
            return {
              ok: resp.ok,
              status: resp.status,
              json
            }
          })
        })
        .then((res) => {
          if (!res.ok) {
            reject(`Error: ${res.status}: ${JSON.stringify(res.json, null, 2)}`)
            return
          }
          if (process.env.VERBOSE) {
            console.log(`looking for merge_commit_sha === [${sha}] in ${JSON.stringify(res.json, null, 2)}`)
          }
          const ghPr = __.find(res.json, {'merge_commit_sha': sha})
          if (!ghPr) {
            reject(`No PR found for sha [${sha}]`)
            return
          }

          resolve({
            number: ghPr.number,
            description: ghPr.body,
            url: ghPr.html_url,
            mergeCommitSha: ghPr.merge_commit_sha,
            headSha: ghPr.head.sha
          })
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
      const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=closed`
      if (process.env.VERBOSE) {
        console.log(`About to send GET to ${url}`)
      }
      fetch(url, getFetchOpts())
        .then((resp) => {
          return resp.json().then((json) => {
            return {
              ok: resp.ok,
              status: resp.status,
              json
            }
          })
        })
        .then((res) => {
          if (!res.ok) {
            reject(`Error: ${res.status}: ${JSON.stringify(res.json, null, 2)}`)
            return
          }
          if (process.env.VERBOSE) {
            console.log(`looking for head.sha === [${sha}] in ${JSON.stringify(res.json, null, 2)}`)
          }
          const ghPr = __.find(res.json, (pr) => {
            return (__.get(pr, 'head.sha') === sha)
          })

          if (!ghPr) {
            reject(`No PR found for sha [${sha}]`)
            return
          }
          resolve({
            number: ghPr.number,
            description: ghPr.body,
            url: ghPr.html_url,
            mergeCommitSha: ghPr.merge_commit_sha,
            headSha: ghPr.head.sha
          })
        })
        .catch((err) => {
          reject(err)
        })
    })
  }

  getPr (pr) {
    const owner = this.config.owner
    const repo = this.config.repo

    return new Promise((resolve, reject) => {
      const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pr}`
      if (process.env.VERBOSE) {
        console.log(`About to send GET to ${url}`)
      }
      fetch(url, getFetchOpts())
        .then((resp) => {
          if (!resp.ok) {
            reject(`Error: ${res.status}: ${JSON.stringify(res.json, null, 2)}`)
            return
          }

          return resp.json().then((json) => {
            return {
              ok: resp.ok,
              status: resp.status,
              json
            }
          })
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
