'use strict'

/* eslint no-useless-escape: 0 */

require('./typedefs')

const fs = require('fs')
const path = require('path')
const __ = require('lodash')

const logger = require('./logger')

const GFM_CHECKBOX_CHECKED_REGEX = /(-|\*)\s+\[x\].*?#(\w+)#/gi
const GFM_CHECKBOX_UNCHECKED_REGEX = /(-|\*)\s+\[\s\].*?#(\w+)#/gi

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

function throwIfInvalidScope (matches, prDescription, prLink, selectedScopes) {
  if (selectedScopes.length === 0) {
    const gfmCheckboxMatches = prDescription.match(GFM_CHECKBOX_UNCHECKED_REGEX)

    if (Array.isArray(gfmCheckboxMatches) && matches.length === gfmCheckboxMatches.length) {
      throw new Error(`No version-bump scope found for ${prLink}`)
    }
  }

  if (selectedScopes.length !== 1) {
    throw new Error(`Too many version-bump scopes found for ${prLink}`)
  }
}

/**
 * Process the environment variable sections in the config and fill in the computed properties within it
 * @param {Config} config - the config object to process (will be mutated in-place)
 */
function processEnv (config) {
  // Grab the CI stuff from env
  config.computed.ci.buildNumber = getEnv(config.ci.env.buildNumber)
  config.computed.ci.prNumber = getEnv(config.ci.env.pr, 'false')
  config.computed.ci.isPr = config.computed.ci.prNumber !== 'false'
  config.computed.ci.branch = getEnv(config.ci.env.branch, 'master')

  logger.log(`pr-bumper::config: prNumber [${config.computed.ci.prNumber}], isPr [${config.computed.ci.isPr}]`)

  // Fill in the owner/repo from the repo slug in env if necessary
  const repoSlug = getEnv(config.ci.env.repoSlug)

  if (repoSlug) {
    const parts = repoSlug.split('/')
    if (!config.vcs.repository.owner) {
      config.vcs.repository.owner = parts[0]
    }

    if (!config.vcs.repository.name) {
      config.vcs.repository.name = parts[1]
    }
  }

  // Grab the VCS stuff from the env
  config.computed.vcs.auth = {
    password: getEnv(config.vcs.env.password),
    readToken: getEnv(config.vcs.env.readToken),
    username: getEnv(config.vcs.env.username),
    writeToken: getEnv(config.vcs.env.writeToken)
  }
}

const utils = {
  /**
   * Read in the config from a file and apply defaults
   * @returns {Config} the config object
   */
  getConfig () {
    let config = {}

    try {
      config = this.readJsonFile('.pr-bumper.json')
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
      // This is where we put everything we calculate/compute based on other settings (@job13er 2017-06-16)
      computed: {
        baselineCoverage: 0,
        ci: {
          buildNumber: '',
          branch: '',
          isPr: false,
          prNumber: ''
        },
        vcs: {
          auth: {
            username: '',
            password: ''
          }
        }
      },
      features: {
        changelog: {
          enabled: false,
          file: 'CHANGELOG.md'
        },
        comments: {
          enabled: false
        },
        compliance: {
          enabled: false,
          production: false,
          output: {
            directory: undefined,
            requirementsFile: 'js-requirements.json',
            reposFile: 'repos',
            ignoreFile: 'ignore'
          },
          additionalRepos: []
        },
        coverage: {
          enabled: false,
          file: 'coverage/coverage-summary.json'
        },
        dependencies: {
          enabled: false,
          snapshotFile: 'dependency-snapshot.json'
        },
        maxScope: {
          enabled: false,
          value: 'major'
        },
        logging: {
          enabled: false,
          file: 'pr-bumper-log.json'
        }
      },
      vcs: {
        domain: 'github.com',
        env: {
          readToken: 'RO_GH_TOKEN',
          writeToken: 'GITHUB_TOKEN',
          username: '',
          password: ''
        },
        provider: 'github',
        repository: {
          name: '',
          owner: ''
        }
      }
    }

    walkObject('', defaults, leaves)
    Object.keys(leaves).forEach((key) => {
      const value = leaves[key]
      if (__.get(config, key) === undefined) {
        __.set(config, key, value)
      }
    })

    processEnv(config)

    const pkgJson = this.readJsonFile('package.json')
    if (pkgJson && pkgJson['pr-bumper'] && pkgJson['pr-bumper'].coverage) {
      config.computed.baselineCoverage = pkgJson['pr-bumper'].coverage
    }

    /**
     * Check if given feature is enabled
     * @param {String} featureName - the name of the feature to check
     * @returns {Boolean} true if feature enabled, else false
     */
    config.isEnabled = function (featureName) {
      return __.get(this, `features.${featureName}.enabled`) || false
    }

    return config
  },

  /**
   * Make sure scope is one of 'patch', 'minor', 'major', 'none' (or their aliases)
   *
   * @param {Object} params - the params object
   * @param {String} params.scope - the scope to check
   * @param {String} params.maxScope - the maximum scope allowed
   * @param {String} params.prNumber - the # of the PR
   * @param {String} params.prUrl - the url of the PR
   * @returns {String} the validated scope
   * @throws Error if scope is invalid
   */
  getValidatedScope (params) {
    params = Object.assign({maxScope: 'major'}, params)
    const scope = params.scope
    const maxScope = params.maxScope
    const prNumber = params.prNumber
    const prUrl = params.prUrl

    const scopeLookup = {
      fix: 'patch',
      patch: 'patch',
      feature: 'minor',
      minor: 'minor',
      breaking: 'major',
      major: 'major',
      none: 'none'
    }

    const scopeWeights = {
      'none': 0,
      'patch': 1,
      'minor': 2,
      'major': 3
    }

    const validatedScope = scopeLookup[scope]
    const prStr = `PR #${prNumber} (${prUrl})`

    if (!validatedScope) {
      throw new Error(`Invalid version-bump scope "${scope}" found for ${prStr}`)
    }

    if (scopeWeights[validatedScope] > scopeWeights[maxScope]) {
      throw new Error(`Version-bump scope "${scope}" is higher than the maximum "${maxScope}" for ${prStr}`)
    }

    return validatedScope
  },

  /**
   * Extract the scope string ('patch', 'minor', 'major', 'none') from the PR object
   * @param {PullRequest} pr - the PR object
   * @param {String} maxScope - the max valid scope
   * @returns {String} the scope of the PR (from the pr description)
   * @throws Error if there is not a single, valid scope in the PR description
   */
  getScopeForPr (pr, maxScope = 'major') {
    const matches = pr.description.match(/#[A-Za-z]+#/g)
    const prLink = `[PR #${pr.number}](${pr.url})`

    if (!matches) {
      const example = 'Please include a scope (e.g. `#major#`, `#minor#`, `#patch#`) in your PR description.'
      const exampleLink = 'See https://github.com/ciena-blueplanet/pr-bumper#pull-requests for more details.'
      throw new Error(`No version-bump scope found for ${prLink}\n${example}\n${exampleLink}`)
    }

    let scope

    if (matches.length > 1) {
      let selectedScopes = []
      let checkboxMatches
      while ((checkboxMatches = GFM_CHECKBOX_CHECKED_REGEX.exec(pr.description)) !== null) {
        selectedScopes.push(checkboxMatches[2])
      }

      throwIfInvalidScope(matches, pr.description, prLink, selectedScopes)

      scope = selectedScopes[0]
    } else {
      scope = matches[0].replace(/#/g, '')
    }

    return utils.getValidatedScope({
      scope: scope.toLowerCase(),
      maxScope,
      prNumber: pr.number,
      prUrl: pr.url
    })
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
   * @param {Config} config - the config object
   * @returns {Number} the coverage line percentage
   */
  getCurrentCoverage (config) {
    const coverageSummary = this.readJsonFile(config.features.coverage.file)
    const totalStatements = __.get(coverageSummary, 'total.statements.total', -1)

    if (totalStatements === -1) {
      return -1
    }

    const coveredStatements = __.get(coverageSummary, 'total.statements.covered')
    const totalBranches = __.get(coverageSummary, 'total.branches.total', -1)
    const coveredBranches = __.get(coverageSummary, 'total.branches.covered')

    const pct = (coveredStatements + coveredBranches) / (totalStatements + totalBranches) * 100

    return Number(pct.toFixed(2)) // cut it off at two decimal points
  },

  /**
   * Maybe post a comment to the PR, if prComments is enabled
   * @param {Config} config - the bumper config
   * @param {Vcs} vcs - the vcs instance for the bumper
   * @param {String} msg - the message to post
   * @param {Boolean} isError - if true, prefix the msg with an ## ERROR heading
   * @returns {Promise} a promise resolved when success, rejected on error
   */
  maybePostComment (config, vcs, msg, isError) {
    if (!process.env['SKIP_COMMENTS'] && config.computed.ci.isPr && config.isEnabled('comments')) {
      const comment = isError ? `## ERROR\n${msg}` : msg
      return vcs.postComment(config.computed.ci.prNumber, comment)
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
      if (config.computed.ci.isPr && config.isEnabled('comments')) {
        return vcs.postComment(config.computed.ci.prNumber, `## ERROR\n${e.message}`)
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
  },

  /**
   * Read in a JSON file and return the parsed json
   * @param {String} filename - the name of the file to read
   * @returns {Object} the json object
   */
  readJsonFile (filename) {
    const fullPath = path.join(process.cwd(), filename)
    return JSON.parse(fs.readFileSync(fullPath, {encoding: 'utf8'}))
  }
}

module.exports = utils
