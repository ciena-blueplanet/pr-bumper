'use strict'

require('./typedefs')

const path = require('path')
const versiony = require('versiony')
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
   * If we are in a PR build, just grab the sha from env, if not
   * take a look at the git history (one before the merge we're handling) and find that PR
   * @returns {String} the sha of the current commit
   */
  getSha () {
    if (process.env.TRAVIS_PULL_REQUEST && (process.env.TRAVIS_PULL_REQUEST !== 'false')) {
      console.log(`Using TRAVIS_COMMIT [${process.env.TRAVIS_COMMIT}] for sha`)
      return Promise.resolve(process.env.TRAVIS_COMMIT)
    }

    return exec('git log -1 --skip=1 --format="%H"').then((stdout) => {
      const sha = stdout.replace('\n', '')
      console.log(`Using [${sha}] for sha`)
      return sha
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
    return utils.getValidatedScope(scope, pr.number, pr.url)
  },

  /**
   * Bump the version in package.json with the given scope
   * @param {String} scope - the scope of the version bump (major, minor, patch)
   */
  bumpVersion (scope) {
    switch (scope) {
      case 'patch':
        versiony
          .patch()
          .with('package.json')
          .end()
        break

      case 'minor':
        versiony
          .minor()
          .patch(0)
          .with('package.json')
          .end()
        break

      case 'major':
        versiony
          .major()
          .minor(0)
          .patch(0)
          .with('package.json')
          .end()
        break

      default:
        throw new Error(`bumpVersion: Invalid scope [${scope}]`)
    }
  },

  /**
   * Bump the version in package.json with the given scope
   * @returns {Promise} - a promise resolved with the results of the git commands
   */
  commitChanges () {
    // TODO: make this more configurable
    const buildNumber = process.env.TRAVIS_BUILD_NUMBER

    return exec('git config --global user.email "builds@travis-ci.com"')
      .then((stdout) => {
        console.log(stdout)
        return exec('git config --global user.name "Travis CI"')
      })
      .then((stdout) => {
        // TODO: make this more configurable? (what's being bumped that is)
        console.log(stdout)
        return exec(`git add package.json`)
      })
      .then((stdout) => {
        console.log(stdout)
        return exec(`git commit -m "Automated version bump [ci skip]" -m "From CI build ${buildNumber}"`)
      })
      .then((stdout) => {
        console.log(stdout)
        const name = require(path.join(process.cwd(), 'package.json')).version
        return exec(`git tag v${name} -a -m "Generated tag from CI build ${buildNumber}"`)
      })
  }
}

module.exports = utils
