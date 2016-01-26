'use strict';

require('./typedefs')

const __ = require('lodash')
const github = require('github-basic')
const Promise = require('promise')
const cpExec = require('child_process').exec

const exec = Promise.denodeify(cpExec)
const client = github({version: 3})

/**
 * Make sure scope is one of 'patch', 'minor', 'major'
 * @param {String} scope - the scope to check
 * @param {String} prNumber - the # of the PR
 * @param {String} prUrl - the url of the PR
 * @throws Error if scope is invalid
 */
function validateScope(scope, prNumber, prUrl) {
  switch (scope) {
    case 'patch': // fallthrough
    case 'minor': // fallthrough
    case 'major':
      // do nothing, valid
      break;

    default:
      throw new Error(`Invalid version-bump scope [${scope}] found for PR #${prNumber} (${prUrl})`)
  }
}

const lib = {

  /**
   * Use `git` command to find out the SHA hash for the current commit
   * @returns {String} the sha of the current commit
   */
  getSha() {
    return exec('git log -1 --format="%H"').then((stdout) => {
      return stdout.replace('\n', '')
    })
  },

  /**
   * Use the GitHub API to fetch the PR object for the given owner, repo, and sha
   * @param {String} owner - the organization or user who owns the repo the PR is against
   * @param {String} repo - the name of the repository the PR is against
   * @param {String} sha - the merge commit SHA for the PR
   * @returns {Promise} a promise resolved with the the PR from the GitHub API
   */
  getPrForSha(owner, repo, sha) {
    return new Promise((resolve, reject) => {
      client.get('/repos/:owner/:repo/pulls', {owner, repo}, (err, res) => {
        if (err) {
          reject(err)
        } else {
          const pr = __.find(res, {'merge_commit_sha': sha})
          if (!pr) {
            reject(`No PR found for sha [${sha}]`)
          } else {
            resolve(pr)
          }
        }
      })
    })
  },

  /**
   * Extract the scope string ('patch', 'minor', 'major') from the PR object
   * @param {PR} pr - the PR object from GitHub API
   * @returns {String} the scope of the PR (from the pr description)
   * @throws Error if there is not a single, valid scope in the PR description
   */
  getScopeForPr(pr) {
    const url = pr['html_url']
    const number = pr.number

    const matches = pr.body.match(/#[A-Za-z]+#/g)

    if (!matches) {
      throw new Error(`No version-bump scope found for PR #${number} (${url})`)
    }

    if (matches.length > 1) {
      throw new Error(`Too many version-bump scopes found for PR #${number} (${url})`)
    }

    const scope = matches[0].replace(/#/g, '').toLowerCase()
    validateScope(scope, number, url)
    return scope
  },
}

module.exports = lib;
