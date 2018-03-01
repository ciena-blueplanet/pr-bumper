'use strict'

require('./typedefs')

const __ = require('lodash')
const cpExec = require('child_process').exec
const prependFile = require('prepend-file')
const Promise = require('promise')
const versiony = require('versiony')
const path = require('path')
const fs = require('fs')

const pkgJson = require('../package.json')

// Compliance implementation
let dependencies = require('./compliance/dependencies')

// using let so stuff can be rewired in the test
let exec = Promise.denodeify(cpExec)
let prepend = Promise.denodeify(prependFile)
let readFile = Promise.denodeify(fs.readFile)
let writeFile = Promise.denodeify(fs.writeFile)

const logger = require('./logger')
const utils = require('./utils')

/**
 * Adds the given filename to info.modifiedFiles if it doesn't already exist
 * @param {PrInfo} info - the info for the PR
 * @param {String[]} info.modifiedFiles - the list of modified files so far
 * @param {String} filename - the filename to add to info.modifiedFiles if it's not already there
 */
function addModifiedFile (info, filename) {
  if (info.modifiedFiles.indexOf(filename) === -1) {
    info.modifiedFiles.push(filename)
  }
}

/**
 * Perform the patch bump, either using .patch() or .preRelease() (the latter if there's a pre-release tag)
 * @param {*} v - the versiony instance
 */
function performPatch (v) {
  if (v.model.hasPreRelease()) {
    v.preRelease()
  } else {
    v.patch()
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
    if (__.get(this.config, 'computed.ci.isPr')) {
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
        if (fs.existsSync('package-lock.json')) {
          return this._maybeBumpVersion(info, 'package-lock.json')
        }
        return info
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
      .then((info) => {
        return this._maybeLogChanges(info)
      })
  }

  /**
   * Check a PR for a version-bump comment
   * @returns {Promise} a promise resolved when complete or rejected on error
   */
  check () {
    if (!this.config.computed.ci.isPr) {
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
    const link = 'https://github.com/ciena-blueplanet/pr-bumper#featurescoverage'
    if (!this.config.isEnabled('coverage')) {
      const msg = `Code coverage feature not enabled!\nSee ${link} for configuration info.`
      return utils.maybePostComment(this.config, this.vcs, msg, true)
        .then(() => {
          return Promise.reject(msg)
        })
    }

    const base = this.config.computed.baselineCoverage
    if (!__.isNumber(base)) {
      const msg = `Baseline coverage is not a number!\nSee ${link} for configuration info.`
      return utils.maybePostComment(this.config, this.vcs, msg, true)
        .then(() => {
          return Promise.reject(msg)
        })
    }

    const pct = utils.getCurrentCoverage(this.config)
    if (pct < 0) {
      const msg = `No current coverage info found!\nSee ${link} for configuration info.`
      return utils.maybePostComment(this.config, this.vcs, msg, true)
        .then(() => {
          return Promise.reject(msg)
        })
    }

    if (base > pct) {
      const diffStr = (base - pct).toFixed(2)
      const baseStr = base.toFixed(2)
      const pctStr = pct.toFixed(2)
      const msg = `Code Coverage: \`${pctStr}%\` (dropped \`${diffStr}%\` from \`${baseStr}%\`)`
      return utils.maybePostComment(this.config, this.vcs, msg)
        .then(() => {
          return Promise.reject(msg)
        })
    }

    const msg = this._getCoverageMsg(base, pct)
    logger.log(msg, true)
    return utils.maybePostComment(this.config, this.vcs, msg)
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
      return `Code Coverage: \`${pctStr}%\` (increased \`${diffStr}%\` from \`${baseStr}%\`)`
    } else {
      return `Code Coverage: \`${baseStr}%\` (no change)`
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

      // The commit that represents the merging of the PR will include the text 'pull request #' so
      // we find that one
      const mergeCommit = __.find(commits, (commit) => {
        return commit.match('pull request #') !== null
      })

      // Get the number from the PR commit
      const prNumber = mergeCommit.match(/pull request #(\d*)/)[1]

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
        let maxScope = 'major'
        if (this.config.isEnabled('maxScope')) {
          maxScope = this.config.features.maxScope.value
        }
        const scope = utils.getScopeForPr(pr, maxScope)
        const getChangelog = this.config.isEnabled('changelog') && scope !== 'none'

        return {
          changelog: getChangelog ? utils.getChangelogForPr(pr) : '',
          modifiedFiles: [],
          number: pr.number,
          scope,
          url: pr.url
        }
      })
  }

  /**
   * Get the pr scope for the current (open) pull request
   * @returns {Promise} a promise - resolved with PR info (changelog and scope) or rejected on error
   */
  _getOpenPrInfo () {
    const vcs = this.vcs
    return vcs.getPr(this.config.computed.ci.prNumber)
      .then((pr) => {
        let scope
        return utils.maybePostCommentOnError(this.config, this.vcs, () => {
          let maxScope = 'major'
          if (this.config.isEnabled('maxScope')) {
            maxScope = this.config.features.maxScope.value
          }
          scope = utils.getScopeForPr(pr, maxScope)
          return {pr, scope}
        })
      })
      .then((data) => {
        const pr = data.pr
        const scope = data.scope

        const getChangelog = this.config.isEnabled('changelog') && scope !== 'none'
        let changelog = ''
        if (getChangelog) {
          return utils.maybePostCommentOnError(this.config, this.vcs, () => {
            changelog = utils.getChangelogForPr(pr)
            return {changelog, number: pr.number, scope, url: pr.url}
          })
        }

        return Promise.resolve({changelog, number: pr.number, scope, url: pr.url})
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

    const v = versiony.from(pkgJsonFile)
    switch (info.scope) {
      case 'patch':
        performPatch(v)
        break

      case 'minor':
        v.newMinor()
        break

      case 'major':
        v.newMajor()
        break

      default:
        throw new Error(`Invalid scope [${info.scope}]`)
    }

    const versionInfo = v.to(pkgJsonFile).end({quiet: true})
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

    const buildNumber = this.config.computed.ci.buildNumber

    return this.ci.setupGitEnv()
      .then(() => {
        return this.ci.add(info.modifiedFiles)
      })
      .then(() => {
        // Currently there are only two reasons we'll have a commit 1) we have a "none" bump with coverage
        // change, or 2) we have a legit bump commit
        let msg = `Automated version bump to ${info.version}`
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

    const buildNumber = this.config.computed.ci.buildNumber
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
    if (!this.config.isEnabled('compliance')) {
      logger.log('Skipping generating dependency compliance report because of config option.')
      return Promise.resolve(info)
    }

    if (info.scope === 'none') {
      logger.log('Skipping generating dependency compliance report because of "none" scope.')
      return Promise.resolve(info)
    }

    const outputPath = __.get(this.config, 'features.compliance.output.directory')

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

    if (!this.config.isEnabled('dependencies')) {
      logger.log('Skipping generating dependency snapshot because of config option.')
      return Promise.resolve(info)
    }

    if (info.scope === 'none') {
      logger.log('Skipping generating dependency snapshot because of "none" scope.')
      return Promise.resolve(info)
    }

    const snapshotFile = __.get(this.config, 'features.dependencies.snapshotFile')
    return exec('npm prune')
      .then(() => {
        return exec('npm shrinkwrap --dev')
      })
      .then(() => {
        return exec(`mv npm-shrinkwrap.json ${snapshotFile}`)
      })
      .then(() => {
        addModifiedFile(info, snapshotFile)
        return info
      })
  }

  /**
   * Maybe log changes to a file
   * @param {PrInfo} info - the info for the PR being bumped
   * @returns {Promise} - a promise resolved with the results of the git commands
   */
  _maybeLogChanges (info) {
    if (!this.config.isEnabled('logging')) {
      logger.log('Skipping logging because of config option.')
      return Promise.resolve(info)
    }

    const logInfo = __.cloneDeep(info)
    delete logInfo.modifiedFiles

    const filename = this.config.features.logging.file
    return writeFile(filename, JSON.stringify(logInfo, null, 2))
      .then(() => {
        return info
      })
  }

  /**
   * Maybe prepend the changelog text from the PrInfo into the CHANGELOG.md file (unless there was no bump)
   * @param {PrInfo} info - the pr info
   * @returns {Promise} - a promise resolved when changelog has been prepended
   */
  _maybePrependChangelog (info) {
    if (!this.config.isEnabled('changelog')) {
      logger.log('Skipping prepending changelog because of config option.')
      return Promise.resolve(info)
    }

    if (info.scope === 'none') {
      logger.log('Skipping prepending changelog because of "none" scope.')
      return Promise.resolve(info)
    }

    const now = new Date()
    const dateString = now.toISOString().split('T').slice(0, 1).join('')

    const data = `# ${info.version} (${dateString})\n${info.changelog}\n\n`
    const filename = this.config.features.changelog.file
    return prepend(filename, data)
      .then(() => {
        addModifiedFile(info, filename)
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
   * @returns {Promise} a Promise
   **/
  _maybeUpdateBaselineCoverage (info) {
    if (!this.config.isEnabled('coverage')) {
      logger.log('Skipping updating baseline code coverage because of config option.')
      return Promise.resolve(info)
    }

    const link = 'https://github.com/ciena-blueplanet/pr-bumper#featurescoverage'
    const pct = utils.getCurrentCoverage(this.config)
    if (pct < 0) {
      const msg = `No current coverage info found!\nSee ${link} for configuration info.`
      return Promise.reject(msg)
    }

    const pkgJsonPath = path.join(process.cwd(), 'package.json')

    return readFile(pkgJsonPath, 'utf8')
      .then((contents) => {
        const pkgJsonContents = JSON.parse(contents)
        // We want to write out the coverage info, even if it didn't exist yet (@job13er 2017-06-19)
        __.set(pkgJsonContents, 'pr-bumper.coverage', pct)
        return JSON.stringify(pkgJsonContents, null, 2)
      })
      .then((data) => {
        return writeFile(pkgJsonPath, data)
      })
      .then(() => {
        addModifiedFile(info, 'package.json')
        return info
      })
  }
}

Bumper.Cancel = Cancel

module.exports = Bumper
