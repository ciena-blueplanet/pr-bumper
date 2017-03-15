'use strict'

/* eslint no-useless-escape: 0 */

require('./typedefs')

const path = require('path')
const __ = require('lodash')

const logger = require('./logger')

/**
 * Walk the properties of an object (recursively) while converting it to a flat representation of the leaves of the
 * object (properties with primitive, non-object types which need their default value set).
 * representing the leaves (the actual values that need defaults)
 * @param {String} prefix - the key prefix for the object being processed
 * @param {Object} object - the complex, nested object of default values currently being processed
 * @param {Object} leaves - the simple key-value mapping of object path -> value
 */
function walkObject (prefix, object, leaves) {
  Object.keys(object).forEach((key) => {
    const value = object[key]
    const fullPrefix = (prefix) ? prefix + '.' + key : key
    if (__.isObject(value) && !__.isArray(value)) {
      walkObject(fullPrefix, value, leaves)
    } else {
      leaves[fullPrefix] = value
    }
  })
}

/**
 * Given a PR description, find the index of the # CHANGELOG section
 * @param {String[]} lines - lines in the pr description
 * @returns {Number} the index of the # CHANGELOG section (or -1)
 * @throws Error if there is more than one matching line
 */
function getChangelogSectionIndex (lines) {
  const validSectionHeaders = [
    '#changelog',
    '# changelog'
  ]

  let index = -1
  for (let i = 0; i < lines.length; i++) {
    const processedLine = lines[i].trim().toLowerCase()
    if (validSectionHeaders.indexOf(processedLine) !== -1) {
      if (index !== -1) {
        throw new Error(`Multiple changelog sections found. Line ${index + 1} and line ${i + 1}.`)
      }
      index = i
    }
  }

  return index
}

/**
 * Get the given key from process.env, substituting "undefined" for the real undefined
 * @param {String} key - the environment variable we want to get
 * @param {*} defaultValue - value to return if key not in env, or if it is 'undefined'
 * @returns {*} whatever is at process.env[key] with the one exception of "undefined" being translated to undefined
 */
function getEnv (key, defaultValue) {
  let value = process.env[key]
  if (value === 'undefined') {
    value = undefined
  }

  return (value === undefined) ? defaultValue : value
}

/**
 * Process the environment variable sections in the config and fill in the computed properties within it
 * @param {Config} config - the config object to process (will be mutated in-place)
 */
function processEnv (config) {
  // Grab the CI stuff from env
  config.ci.buildNumber = getEnv(config.ci.env.buildNumber)
  config.prNumber = getEnv(config.ci.env.pr, 'false')
  config.isPr = config.prNumber !== 'false'
  config.branch = getEnv(config.ci.env.branch, 'master')

  logger.log(`pr-bumper::config: prNumber [${config.prNumber}], isPr [${config.isPr}]`)

  // Fill in the owner/repo from the repo slug in env if necessary
  const repoSlug = getEnv(config.ci.env.repoSlug)

  if (repoSlug) {
    const parts = repoSlug.split('/')
    if (!config.owner) {
      config.owner = parts[0]
    }

    if (!config.repo) {
      config.repo = parts[1]
    }
  }

  // Grab the VCS stuff from the env
  config.vcs.auth = {
    password: getEnv(config.vcs.env.password),
    readToken: getEnv(config.vcs.env.readToken),
    username: getEnv(config.vcs.env.username),
    writeToken: getEnv(config.vcs.env.writeToken)
  }
}

const utils = {
  /**
   * Read in the config from a file and apply defaults
   * @param {Config} [_config] - the configuration for the pr-bumper
   * @param {Object} [_pkgJson] - the data from package.json (passed in during testing)
   * @returns {Config} the config object
   */
  getConfig (_config, _pkgJson) {
    let config = _config || {}

    try {
      config = require(path.join(process.cwd(), '.pr-bumper.json'))
    } catch (e) {
      logger.log('No .pr-bumper.json found, using defaults')
    }

    const leaves = {}
    const defaults = {
      ci: {
        env: {
          branch: 'TRAVIS_BRANCH',
          buildNumber: 'TRAVIS_BUILD_NUMBER',
          pr: 'TRAVIS_PULL_REQUEST',
          repoSlug: 'TRAVIS_REPO_SLUG'
        },
        gitUser: {
          email: 'travis.ci.ciena@gmail.com',
          name: 'Travis CI'
        },
        provider: 'travis'
      },
      isPr: false,
      owner: '',
      repo: '',
      dependencies: {
        production: false,
        output: {
          directory: undefined,
          requirementsFile: 'js-requirements.json',
          reposFile: 'repos',
          ignoreFile: 'ignore'
        },
        additionalRepos: []
      },
      changelogFile: 'CHANGELOG.md',
      dependencySnapshotFile: 'dependency-snapshot.json',
      vcs: {
        domain: 'github.com',
        env: {
          readToken: 'RO_GH_TOKEN',
          writeToken: 'GITHUB_TOKEN'
        },
        provider: 'github'
      },
      prComments: false,
      prependChangelog: true
    }

    walkObject('', defaults, leaves)
    Object.keys(leaves).forEach((key) => {
      const value = leaves[key]
      if (__.get(config, key) === undefined) {
        __.set(config, key, value)
      }
    })

    processEnv(config)

    let pkgJson = _pkgJson

    if (!pkgJson) {
      pkgJson = require(path.join(process.cwd(), 'package.json'))
    }

    if (pkgJson && pkgJson['pr-bumper'] && pkgJson['pr-bumper'].coverage) {
      config.baselineCoverage = pkgJson['pr-bumper'].coverage
    }

    return config
  },

  /**
   * Make sure scope is one of 'patch', 'minor', 'major', 'none' (or their aliases)
   *
   * @param {String} scope - the scope to check
   * @param {String} prNumber - the # of the PR
   * @param {String} prUrl - the url of the PR
   * @returns {String} the validated scope
   * @throws Error if scope is invalid
   */
  getValidatedScope (scope, prNumber, prUrl) {
    const scopeLookup = {
      fix: 'patch',
      patch: 'patch',
      feature: 'minor',
      minor: 'minor',
      breaking: 'major',
      major: 'major',
      none: 'none'
    }

    const validatedScope = scopeLookup[scope]

    if (!validatedScope) {
      throw new Error(`Invalid version-bump scope [${scope}] found for PR #${prNumber} (${prUrl})`)
    }

    return validatedScope
  },

  /**
   * Extract the scope string ('patch', 'minor', 'major', 'none') from the PR object
   * @param {PullRequest} pr - the PR object
   * @returns {String} the scope of the PR (from the pr description)
   * @throws Error if there is not a single, valid scope in the PR description
   */
  getScopeForPr (pr) {
    const matches = pr.description.match(/#[A-Za-z]+#/g)
    const prLink = `[PR #${pr.number}](${pr.url})`

    if (!matches) {
      const example = 'Please include a scope (i.e. `#major`, `#minor#`, `#patch#`) in your PR description.'
      const exampleLink = 'See https://github.com/ciena-blueplanet/pr-bumper#pull-requests for more details.'
      throw new Error(`No version-bump scope found for ${prLink}\n${example}\n${exampleLink}`)
    }

    let scope

    if (matches.length > 1) {
      // check for GFM checkboxes
      const gfmCheckbockRegex = /-\s\[x\].*?#(\w+)#/gi

      let selectedScopes = []
      let checkboxMatches
      while ((checkboxMatches = gfmCheckbockRegex.exec(pr.description)) !== null) {
        selectedScopes.push(checkboxMatches[1])
      }

      if (selectedScopes.length !== 1) {
        throw new Error(`Too many version-bump scopes found for ${prLink}`)
      }

      scope = selectedScopes[0]
    } else {
      scope = matches[0].replace(/#/g, '')
    }

    return utils.getValidatedScope(scope.toLowerCase(), pr.number, pr.url)
  },

  /**
   * Extract the changelog string from the PR object
   * @param {PullRequest} pr - the PR object
   * @returns {String} the changelog of the PR (from the pr description, if one exists, else '')
   */
  getChangelogForPr (pr) {
    const lines = pr.description.split('\n')
    const index = getChangelogSectionIndex(lines)
    let changelog = ''

    if (index >= 0) {
      changelog = lines.slice(index + 1).join('\n')
    }

    if (changelog.trim() === '') {
      const link = 'https://github.com/ciena-blueplanet/pr-bumper#changelog'
      const msg = 'No CHANGELOG content found in PR description.\n' +
        'Please add a `# CHANGELOG` section to your PR description with some content describing your change.\n' +
        `See ${link} for details.`
      throw new Error(msg)
    }

    return changelog
  },

  /**
   * Get the current coverage stats from istanbul coverage-summary data
   * @param {Object} _coverageSummary - contents of coverage-summary.json file (used for testing)
   * @returns {Number} the coverage line percentage
   */
  getCurrentCoverage (_coverageSummary) {
    let coverageSummary = _coverageSummary
    if (!coverageSummary) {
      // TODO: should we maybe make this use readFile and make it async? (ARM 2017-03-14)
      coverageSummary = require(path.join(process.cwd(), 'coverage/coverage-summary.json'))
    }

    const pct = __.get(coverageSummary, 'total.lines.pct') || -1

    return pct
  },

  /**
   * Maybe post a comment to the PR, if prComments is enabled
   * @param {Object} config - the bumper config
   * @param {Vcs} vcs - the vcs instance for the bumper
   * @param {String} msg - the message to post
   * @param {Boolean} isError - if true, prefix the msg with an ## ERROR heading
   * @returns {Promise} a promise resolved when success, rejected on error
   */
  maybePostComment (config, vcs, msg, isError) {
    if (!process.env['SKIP_COMMENTS'] && config.isPr && config.prComments) {
      const comment = isError ? `## ERROR\n${msg}` : msg
      return vcs.postComment(config.prNumber, comment)
        .catch((err) => {
          const newMessage = `Received error: ${err.message} while trying to post PR comment: ${comment}`
          throw new Error(newMessage)
        })
    }

    return Promise.resolve()
  },

  /**
   * Maybe post a comment to the PR, if the function given throws an error, and prComments is enabled
   * @param {Object} config - the config for a bumper instance
   * @param {Vcs} vcs - the vcs instance for a bumper instance
   * @param {Function} func - the function to execute and check for errors on
   * @returns {Promise} a promise resolved if all goes well, rejected if an error is thrown
   */
  maybePostCommentOnError (config, vcs, func) {
    let ret
    try {
      ret = func()
    } catch (e) {
      if (config.isPr && config.prComments) {
        return vcs.postComment(config.prNumber, `## ERROR\n${e.message}`)
          .then(() => {
            throw e
          })
          .catch((err) => {
            if (err !== e) {
              const msg = `Received error: ${err.message} while trying to post PR comment about error: ${e.message}`
              throw new Error(msg)
            }

            throw e
          })
      }
      return Promise.reject(e)
    }

    return Promise.resolve(ret)
  }
}

module.exports = utils
