'use strict'

require('./typedefs')

const path = require('path')
const __ = require('lodash')
const versiony = require('versiony')
const Promise = require('promise')
const cpExec = require('child_process').exec
const exec = Promise.denodeify(cpExec)

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
      console.log('No .pr-bumper.json found, using defaults')
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
   * If we are in a PR build, grab the sha from the github API, if not
   * take a look at the git history (one before the merge we're handling) and find that PR
   * @param {Config} config - the config object
   * @param {Github} vcs - VCS interface
   * @returns {String} the sha of the current commit
   */
  getSha (config, vcs) {
    if (config.isPr) {
      return vcs.getPr(config.prNumber)
        .then((pr) => {
          const sha = pr.merge_commit_sha
          console.log(`Using SHA ${sha} for PR ${config.prNumber}`)
          return sha
        })
    }

    return exec('git log -1 --skip=1 --format="%H"').then((stdout) => {
      const sha = stdout.replace('\n', '')
      console.log(`Using [${sha}] for sha`)
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
    return exec(`git log -50 --oneline | grep -m 1 "Merge pull request" | awk '{print $5;}'`).then((stdout) => {
      const prNumber = stdout.replace('#', '').replace('\n', '')
      console.log(`Fetching PR [${prNumber}]`)
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
