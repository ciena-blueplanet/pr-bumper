'use strict'

require('./typedefs')

const path = require('path')
const __ = require('lodash')
const versiony = require('versiony')
const Promise = require('promise')
const cpExec = require('child_process').exec

// using let so it can be rewired in the test
let exec = Promise.denodeify(cpExec)

const logger = require('./logger')

const utils = {
  /**
   * Get the Options from either the `.pr-bumper.json` file or the defaults
   * @returns {Options} the options object
   */
  getOptions () {
    let options = {}
    try {
      options = require(path.join(process.cwd(), '.pr-bumper.json'))
    } catch (e) {
      logger.log('No .pr-bumper.json found, using defaults')
    }
    __.defaults(options, {
      repoSlugEnv: 'TRAVIS_REPO_SLUG',
      prEnv: 'TRAVIS_PULL_REQUEST',
      buildNumberEnv: 'TRAVIS_BUILD_NUMBER'
    })

    return options
  },

  /**
   * Use an Options object to generate the Config
   * @param {Options} [options] - the options for what environment variables to use
   * @returns {Config} the config object
   */
  getConfig (options) {
    options = options || this.getOptions()

    let owner = options.owner
    let repo = options.repo
    const slug = process.env[options.repoSlugEnv]
    let parts = ['', '']

    if (slug) {
      parts = slug.split('/')
    }

    if (!owner) {
      owner = parts[0]
    }

    if (!repo) {
      repo = parts[1]
    }

    return {
      owner,
      repo,
      isPr: process.env[options.prEnv] !== 'false',
      prNumber: process.env[options.prEnv],
      buildNumber: process.env[options.buildNumberEnv]
    }
  },

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
   * Grab the sha from the github API
   * @param {Config} config - the config object
   * @param {Github} vcs - VCS interface
   * @returns {String} the sha of the current commit
   */
  getSha (config, vcs) {
    return vcs.getPr(config.prNumber)
      .then((pr) => {
        const sha = pr.mergeCommitSha
        logger.log(`Using SHA ${sha} for PR ${config.prNumber}`)
        return sha
      })
  },

  /**
   * Grab the most recent PR
   * @param {Config} config - the config object
   * @param {Github} vcs - VCS interface
   * @returns {Promise} a promise resolved with the most recent PR
   */
  getLastPr (config, vcs) {
    return exec('git log -10 --oneline').then((stdout) => {
      // the --oneline format for `git log` puts each commit on a single line, with the hash and then
      // the commit message, so we first split on \n to get an array of commits
      const commits = stdout.split('\n')

      // The commit that represents the merging of the PR will include the text 'Merge pull request' so
      // we find that one
      const mergeCommit = __.find(commits, (commit) => {
        return commit.indexOf('Merge pull request') !== -1
      })

      // The format of the auto-generated commit line will look something like:
      // 'edf85e0 Merge pull request #30 from job13er/remove-newline'
      // so if we split on the space, and grab the 5th item, it's '#30' then strip the '#' to get '30'
      const prNumber = mergeCommit.split(' ')[4].replace('#', '')

      logger.log(`Fetching PR [${prNumber}]`)
      return vcs.getPr(prNumber)
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
   * @param {String} pkgJsonFile - the full file path to the package.json to bump
   */
  bumpVersion (scope, pkgJsonFile) {
    const v = versiony.from(pkgJsonFile).indent(' '.repeat(2))
    switch (scope) {
      case 'patch':
        v.patch()
        break

      case 'minor':
        v.minor().patch(0)
        break

      case 'major':
        v.newMajor()
        break

      default:
        throw new Error(`bumpVersion: Invalid scope [${scope}]`)
    }

    v.to(pkgJsonFile).end()
  },

  /**
   * Bump the version in package.json with the given scope
   * @param {Config} config - the config object
   * @returns {Promise} - a promise resolved with the results of the git commands
   */
  commitChanges (config) {
    return exec('git config --global user.email "travis.ci.ciena@gmail.com"')
      .then(() => {
        return exec('git config --global user.name "Travis CI"')
      })
      .then(() => {
        return exec('git checkout -b my-master')
      })
      .then(() => {
        // TODO: make this more configurable? (what's being bumped that is)
        return exec(`git add package.json`)
      })
      .then(() => {
        return exec(`git commit -m "Automated version bump [ci skip]" -m "From CI build ${config.buildNumber}"`)
      })
      .then(() => {
        return exec(`node -e "console.log(require('./package.json').version)"`)
      })
      .then((stdout) => {
        const name = stdout.replace('\n', '')
        return exec(`git tag v${name} -a -m "Generated tag from CI build ${config.buildNumber}"`)
      })
  }
}

module.exports = utils
