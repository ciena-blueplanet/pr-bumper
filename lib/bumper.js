'use strict'

require('./typedefs')

const __ = require('lodash')
const cpExec = require('child_process').exec
const prependFile = require('prepend-file')
const Promise = require('promise')
const versiony = require('versiony')
const path = require('path')
const fsWriteFile = require('fs').writeFile

const pkgJson = require('../package.json')

// Compliance implementation
let dependencies = require('./compliance/dependencies')

// using let so stuff can be rewired in the test
let exec = Promise.denodeify(cpExec)
let prepend = Promise.denodeify(prependFile)
let writeFile = Promise.denodeify(fsWriteFile)

const logger = require('./logger')
const utils = require('./utils')

/**
 * Adds the given filename to info.modifiedFiles if it doesn't already exist
 * @param {PrInfo} info - the info for the PR
 * @param {String[]} info.modifiedFiles - the list of modified files so far
 * @param {String} filename - the filename to add to info.modifiedFiles if it's not already there
 */
function addModifiedFile (info, filename) {
  if (!info.modifiedFiles.includes(filename)) {
    info.modifiedFiles.push(filename)
  }
}

class Cancel {
  constructor (message) {
    this.message = message
  }
}

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
      logger.log('Not a merge build, skipping bump')
      return Promise.resolve()
    }

    return this.ci.getLastCommitMsg()
      .then((commitMessage) => {
        if (commitMessage.startsWith(`[${pkgJson.name}]`)) {
          throw new Cancel(`Skipping bump on ${pkgJson.name} commit.`)
        }
        return Promise.resolve()
      })
      .then(() => {
        return this._getMergedPrInfo()
      })
      .then((info) => {
        return this._maybeBumpVersion(info, 'package.json')
      })
      .then((info) => {
        return this._maybePrependChangelog(info)
      })
      .then((info) => {
        return this._maybeGenerateDependencySnapshot(info)
      })
      .then((info) => {
        return this._maybeGenerateDependencyComplianceReport(info)
      })
      .then((info) => {
        return this._maybeUpdateBaselineCoverage(info)
      })
      .then((info) => {
        return this._maybeCommitChanges(info)
      })
      .then((info) => {
        return this._maybeCreateTag(info)
      })
      .then((info) => {
        return this._maybePushChanges(info)
      })
  }

  /**
   * Check a PR for a version-bump comment
   * @returns {Promise} a promise resolved when complete or rejected on error
   */
  check () {
    if (!this.config.isPr) {
      logger.log('Not a PR build, skipping check')
      return Promise.resolve()
    }

    return this._getOpenPrInfo()
      .then((info) => {
        logger.log(`Found a ${info.scope} bump for the current PR`)
      })
  }

  /**
   * Check a build to see if coverage decreased
   * @returns {Promise} a promise resolved when complete or rejected on error
   */
  checkCoverage () {
    const link = 'https://github.com/ciena-blueplanet/pr-bumper#code-coverage'
    const base = this.config.baselineCoverage
    if (!__.isNumber(base)) {
      const msg = `No baseline coverage info found!\nSee ${link} for configuration info.`
      return Promise.reject(msg)
    }

    const pct = utils.getCurrentCoverage()
    if (pct < 0) {
      const msg = `No current coverage info found!\nSee ${link} for configuration info.`
      return Promise.reject(msg)
    }

    if (base > pct) {
      const diffStr = (base - pct).toFixed(2)
      const baseStr = base.toFixed(2)
      const pctStr = pct.toFixed(2)
      const msg = `Coverage dropped ${diffStr}% (from ${baseStr}% to ${pctStr}%) in this PR!`
      return Promise.reject(msg)
    }

    const msg = this._getCoverageMsg(base, pct)
    logger.log(msg)
    return Promise.resolve()
  }

  // = Private Methods ==================================================================

  /**
   * Compute the log message to tell users whether coverage went up or stayed the same
   * @param {Number} base - the base coverage percentage
   * @param {Number} pct - the current coverage percentage
   * @returns {String} the message to log to the user explaining what happened with coverage
   */
  _getCoverageMsg (base, pct) {
    const pctStr = pct.toFixed(2)
    const baseStr = base.toFixed(2)
    if (pct > base) {
      const diffStr = (pct - base).toFixed(2)
      return `Coverage increased ${diffStr}% (from ${baseStr}% to ${pctStr}%) in this PR! Good job :)`
    } else {
      return `Coverage remained the same (at ${baseStr}%) in this PR.`
    }
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
        const scope = utils.getScopeForPr(pr)
        const getChangelog = this.config.prependChangelog && scope !== 'none'

        return {
          changelog: getChangelog ? utils.getChangelogForPr(pr) : '',
          modifiedFiles: [],
          scope: scope
        }
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
        const scope = utils.getScopeForPr(pr)
        const getChangelog = this.config.prependChangelog && scope !== 'none'

        return {
          changelog: getChangelog ? utils.getChangelogForPr(pr) : '',
          scope: scope
        }
      })
  }

  /**
   * Maybe bump the version in package.json with the given scope (if it's not "none")
   * @param {PrInfo} info - the pr info
   * @param {String} pkgJsonFile - the full file path to the package.json to bump
   * @returns {PrInfo} the pr info object passed in
   */
  _maybeBumpVersion (info, pkgJsonFile) {
    if (info.scope === 'none') {
      return info
    }

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
        throw new Error(`Invalid scope [${info.scope}]`)
    }

    const versionInfo = v.to(pkgJsonFile).end()
    info.version = versionInfo.version
    addModifiedFile(info, pkgJsonFile)
    return info
  }

  /**
   * Commit the changed files that were modified by pr-bumper
   * @param {PrInfo} info - the info for the PR being bumped
   * @returns {Promise} - a promise resolved with the results of the git commands
   */
  _maybeCommitChanges (info) {
    if (info.modifiedFiles.length === 0) {
      logger.log('Skipping commit because no files were changed.')
      return Promise.resolve(info)
    }

    const buildNumber = this.config.ci.buildNumber

    return this.ci.setupGitEnv()
      .then(() => {
        return this.ci.add(info.modifiedFiles)
      })
      .then(() => {
        // Currently there are only two reasons we'll have a commit 1) we have a "none" bump with coverage
        // change, or 2) we have a legit bump commit
        let msg = 'Automated version bump'
        if (info.scope === 'none') {
          msg = 'Automated code coverage update'
        }

        return this.ci.commit(`[${pkgJson.name}] ${msg}`, `From CI build ${buildNumber}`)
          .then(() => {
            return info
          })
      })
  }

  /**
   * Maybe create a tag based on the current version
   * @param {PrInfo} info - the info for the PR being bumped
   * @returns {Promise} - a promise resolved with the results of the git commands
   */
  _maybeCreateTag (info) {
    if (info.scope === 'none') {
      logger.log('Skipping tag creation because of "none" scope.')
      return Promise.resolve(info)
    }

    const buildNumber = this.config.ci.buildNumber
    return this.ci.tag(`v${info.version}`, `Generated tag from CI build ${buildNumber}`)
      .then(() => {
        return info
      })
  }

  /**
   * process a dependency report
   * @param {PrInfo} info - the info for the PR being bumped
   * @returns {Promise} a Promise
   */
  _maybeGenerateDependencyComplianceReport (info) {
    let outputPath = __.get(this.config, 'dependencies.output.directory')

    if (!outputPath) {
      logger.log('Skipping generating dependency compliance report because of config option.')
      return Promise.resolve(info)
    }

    if (info.scope === 'none') {
      logger.log('Skipping generating dependency compliance report because of "none" scope.')
      return Promise.resolve(info)
    }

    const cwd = process.cwd()
    return dependencies.run(cwd, path.join(cwd, outputPath), this.config)
      .then(() => {
        addModifiedFile(info, outputPath)
        return info
      })
  }

  /**
   * Maybe generate a dependency snapshot file by using `npm shrinkwrap`
   * TODO: do we want to handle projects that include npm-shrinkwrap.json?
   * @param {PrInfo} info - the info for the PR being bumped
   * @returns {Promise} a promise resolved when operation completes
   */
  _maybeGenerateDependencySnapshot (info) {
    // We need to do the prune b/c of the following issue with npm-shrinkwrap
    // https://github.com/SaltwaterC/aws2js/issues/58, apparently one of our deps
    // installs things w/o having them in package.json, causing npm shrinkwrap to barf

    if (!this.config.dependencySnapshotFile) {
      logger.log('Skipping generating dependency snapshot because of config option.')
      return Promise.resolve(info)
    }

    if (info.scope === 'none') {
      logger.log('Skipping generating dependency snapshot because of "none" scope.')
      return Promise.resolve(info)
    }

    return exec('npm prune')
      .then(() => {
        return exec('npm shrinkwrap --dev')
      })
      .then(() => {
        return exec(`mv npm-shrinkwrap.json ${this.config.dependencySnapshotFile}`)
      })
      .then(() => {
        addModifiedFile(info, this.config.dependencySnapshotFile)
        return info
      })
  }

  /**
   * Maybe prepend the changelog text from the PrInfo into the CHANGELOG.md file (unless there was no bump)
   * @param {PrInfo} info - the pr info
   * @returns {Promise} - a promise resolved when changelog has been prepended
   */
  _maybePrependChangelog (info) {
    if (!this.config.prependChangelog) {
      logger.log('Skipping prepending changelog because of config option.')
      return Promise.resolve(info)
    }

    if (info.scope === 'none') {
      logger.log('Skipping prepending changelog because of "none" scope.')
      return Promise.resolve(info)
    }

    const data = `# ${info.version}\n${info.changelog}\n\n`
    return prepend(this.config.changelogFile, data)
      .then(() => {
        addModifiedFile(info, this.config.changelogFile)
        return info
      })
  }

  /**
   * Maybe push changes back to repo
   * @param {PrInfo} info - the info for the PR being bumped
   * @returns {Promise} - a promise resolved with the results of the git commands
   */
  _maybePushChanges (info) {
    if (info.modifiedFiles.length === 0) {
      logger.log('Skipping push because nothing changed.')
      return Promise.resolve(info)
    }

    return this.ci.push(this.vcs)
      .then(() => {
        return info
      })
  }

  /**
   * Maybe update the code coverage in package.json
   * @param {PrInfo} info - the info for the PR being bumped
   * @param {Object} _pkgJson - the contents of `package.json` for the project being bumped (used for testing)
   * @returns {Promise} a Promise
   **/
  _maybeUpdateBaselineCoverage (info, _pkgJson) {
    const base = this.config.baselineCoverage
    if (!__.isNumber(base)) {
      logger.log('Skipping updating baseline code coverage because no valid coverage found.')
      return Promise.resolve(info)
    }

    const link = 'https://github.com/ciena-blueplanet/pr-bumper#code-coverage'
    const pct = utils.getCurrentCoverage()
    if (pct < 0) {
      const msg = `No current coverage info found!\nSee ${link} for configuration info.`
      return Promise.reject(msg)
    }

    let pkgJsonContents = _pkgJson
    const pkgJsonPath = path.join(process.cwd(), 'package.json')
    if (!pkgJsonContents) {
      pkgJsonContents = require(pkgJsonPath)
    }

    pkgJsonContents['pr-bumper'].coverage = pct

    return writeFile(pkgJsonPath, JSON.stringify(pkgJsonContents, null, 2))
      .then(() => {
        addModifiedFile(info, 'package.json')
        return info
      })
  }
}

Bumper.Cancel = Cancel

module.exports = Bumper
