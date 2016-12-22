'use strict'

require('./typedefs')

const __ = require('lodash')
const cpExec = require('child_process').exec
const prependFile = require('prepend-file')
const Promise = require('promise')
const versiony = require('versiony')
const path = require('path')

// Compliance implementation
let dependencies = require('./compliance/dependencies')

// using let so stuff can be rewired in the test
let exec = Promise.denodeify(cpExec)
let prepend = Promise.denodeify(prependFile)

const pkgJson = require('../package.json')
const logger = require('./logger')
const utils = require('./utils')

/**
 * Interacts with a Vcs to achieive a version bump
 * @class
 */
class Bumper {
  // = Public Methods ===================================================================

  /**
   * @param {Object} params - params obj
   * @param {Config} params.config - the bumper config object
   * @param {Vcs} params.vcs - the vcs instance to use
   * @param {Ci} params.ci - the ci instance to use
   */
  constructor (params) {
    this.config = params.config
    this.vcs = params.vcs
    this.ci = params.ci
  }

  /**
   * Bump the version based on the last merged PR's version-bump comment
   * @param {Object} options the cli options
   * @returns {Promise} a promise resolved with the results of the push
   */
  bump () {
    if (this.config.isPr) {
      logger.log(`${pkgJson.name}: Not a merge build, skipping bump`)
      return Promise.resolve()
    }

    return this._getMergedPrInfo()
      .then((info) => {
        return this._bumpVersion(info, 'package.json')
      })
      .then((info) => {
        if (!this.config.prependChangelog) {
          return Promise.resolve()
        }
        return this._prependChangelog(info, 'CHANGELOG.md')
      })
      .then(() => {
        return this._dependencies()
      })
      .then(() => {
        return this._commitChanges()
      })
      .then(() => {
        return this._createTag()
      })
      .then(() => {
        return this.ci.push(this.vcs)
      })
  }

  /**
   * Check a PR for a version-bump comment
   * @returns {Promise} a promise resolved when complete or rejected on error
   */
  check () {
    if (!this.config.isPr) {
      logger.log(`${pkgJson.name}: Not a PR build, skipping check`)
      return Promise.resolve()
    }

    return this._getOpenPrInfo()
      .then((info) => {
        logger.log(`Found a ${info.scope} bump for the current PR`)
      })
  }

  // = Private Methods ==================================================================

  /**
   * Bump the version in package.json with the given scope
   * @param {PrInfo} info - the pr info
   * @param {String} pkgJsonFile - the full file path to the package.json to bump
   * @returns {PrInfo} the pr info object passed in
   */
  _bumpVersion (info, pkgJsonFile) {
    const v = versiony.from(pkgJsonFile).indent(' '.repeat(2))
    switch (info.scope) {
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
        throw new Error(`pr-bumper: Invalid scope [${info.scope}]`)
    }

    const versionInfo = v.to(pkgJsonFile).end()
    info.version = versionInfo.version
    return info
  }

  /**
   * Commit the changed files 'package.json' and 'CHANGELOG.md'
   * @param {Object} config - the .pr-bumper.json config
   * @returns {Promise} - a promise resolved with the results of the git commands
   */
  _commitChanges () {
    const buildNumber = this.config.ci.buildNumber

    return this.ci.setupGitEnv()
      .then(() => {
        var adds = ['package.json', 'CHANGELOG.md']
        var reportOutput = __.get(this.config, 'dependencies.output.directory')
        if (reportOutput) {
          adds.push(`${reportOutput}/`)
        }
        // TODO: make this more configurable? (what's being bumped that is)
        console.log(`adding ${adds} to the git stage`)
        return this.ci.add(adds)
      })
      .then(() => {
        return this.ci.commit('Automated version bump [ci skip]', `From CI build ${buildNumber}`)
      })
  }

  /**
   * Create a tag based on the current version
   * @returns {Promise} - a promise resolved with the results of the git commands
   */
  _createTag () {
    const buildNumber = this.config.ci.buildNumber

    return exec('node -e "console.log(require(\'./package.json\').version)"')
      .then((stdout) => {
        const name = stdout.replace('\n', '')
        return this.ci.tag(`v${name}`, `Generated tag from CI build ${buildNumber}`)
      })
  }

  /**
   * process a dependency report
   * @param {Object} config the .pr-bumper.json config
   * @returns {Promise} a Promise
   **/
  _dependencies () {
    const cwd = process.cwd()
    let outputPath = __.get(this.config, 'dependencies.output.directory')
    const absOutputPath = outputPath ? path.join(cwd, outputPath) : null
    if (absOutputPath) {
      return dependencies.run(cwd, absOutputPath, this.config)
    }
    return Promise.resolve('skipping dependencies')
  }

  /**
   * Grab the most recent PR
   * @returns {PrPromise} a promise resolved with the most recent PR
   */
  _getLastPr () {
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
      return this.vcs.getPr(prNumber)
    })
  }

  /**
   * Get the PR scope for the current (merged) pull request
   * @returns {Promise} a promise - resolved with PR info (changelog and scope) or rejected on error
   */
  _getMergedPrInfo () {
    return this._getLastPr()
      .then((pr) => {
        return Promise.all([utils.getChangelogForPr(pr), utils.getScopeForPr(pr)]).then((result) => {
          return {
            changelog: result[0],
            scope: result[1]
          }
        })
      })
  }

  /**
   * Get the pr scope for the current (open) pull request
   * @returns {Promise} a promise - resolved with PR info (changelog and scope) or rejected on error
   */
  _getOpenPrInfo () {
    const vcs = this.vcs
    return vcs.getPr(this.config.prNumber)
      .then((pr) => {
        return Promise.all([
          this.config.prependChangelog ? utils.getChangelogForPr(pr) : Promise.resolve(''),
          utils.getScopeForPr(pr)
        ]).then((result) => {
          return {
            changelog: result[0],
            scope: result[1]
          }
        })
      })
  }

  /**
   * Prepend the changelog text from the PrInfo into the
   * @param {PrInfo} info - the pr info
   * @param {String} changelogFile - the full file path to the CHANGELOG.md file to bump
   * @returns {Promise} - a promise resolved when changelog has been prepended
   */
  _prependChangelog (info, changelogFile) {
    const data = `# ${info.version}\n${info.changelog}\n\n`
    return prepend(changelogFile, data)
  }
}

module.exports = Bumper
