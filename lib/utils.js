'use strict'

require('./typedefs')

const Promise = require('promise')
const cpExec = require('child_process').exec

const exec = Promise.denodeify(cpExec)

const utils = {

  /**
   * Make sure scope is one of 'patch', 'minor', 'major' (or their aliases)
   *
   * @param {String} scope - the scope to check
   * @param {String} prNumber - the # of the PR
   * @param {String} prUrl - the url of the PR
   * @returns {String} the validated scope
   * @throws Error if scope is invalid
   */
  getValidatedScope (scope, prNumber, prUrl) {
    switch (scope) {
      case 'fix': // fallthrough
      case 'patch':
        return 'patch'

      case 'feature':  // fallthrough
      case 'minor':
        return 'minor'

      case 'breaking': // fallthrough
      case 'major':
        return 'major'

      default:
        throw new Error(`Invalid version-bump scope [${scope}] found for PR #${prNumber} (${prUrl})`)
    }
  },

  /**
   * Use `git` command to find out the SHA hash for the current commit
   * @returns {String} the sha of the current commit
   */
  getSha () {
    return exec('git log -1 --format="%H"').then((stdout) => {
      return stdout.replace('\n', '')
    })
  },

  /**
   * Extract the scope string ('patch', 'minor', 'major') from the PR object
   * @param {PullRequest} pr - the PR object
   * @returns {String} the scope of the PR (from the pr description)
   * @throws Error if there is not a single, valid scope in the PR description
   */
  getScopeForPr (pr) {
    const matches = pr.description.match(/#[A-Za-z]+#/g)

    if (!matches) {
      throw new Error(`No version-bump scope found for PR #${pr.number} (${pr.url})`)
    }

    if (matches.length > 1) {
      throw new Error(`Too many version-bump scopes found for PR #${pr.number} (${pr.url})`)
    }

    const scope = matches[0].replace(/#/g, '').toLowerCase()
    return utils.getValidateScope(scope, pr.number, pr.url)
  }
}

module.exports = utils
