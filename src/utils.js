/**
 * @flow
 */

/* eslint no-useless-escape: 0 */

import fs from 'fs'
import __ from 'lodash'
import nullthrows from 'nullthrows'
import path from 'path'

import defaultConfig from './default-config'
import logger from './logger'
import type {Config, PullRequest, Vcs} from './typedefs'

/**
 * Walk the properties of an object (recursively) while converting it to a flat representation of the leaves of the
 * object (properties with primitive, non-object types which need their default value set).
 * representing the leaves (the actual values that need defaults)
 * @param {String} prefix - the key prefix for the object being processed
 * @param {Object} object - the complex, nested object of default values currently being processed
 * @param {Object} leaves - the simple key-value mapping of object path -> value
 */
function walkObject (prefix: string, object: Object, leaves: Object): void { // eslint-disable-line
  Object.keys(object).forEach((key: string) => {
    const value = object[key]
    const fullPrefix = (prefix) ? prefix + '.' + key : key
    if (__.isObject(value) && !__.isArray(value) && !__.isFunction(value)) {
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
function getChangelogSectionIndex (lines: string[]): number {
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
function getEnv (key: string, defaultValue?: string): string | null | void {
  let value: ?string = process.env[key]

  if (value === 'undefined') {
    value = undefined
  }

  return (value === undefined) ? defaultValue : value
}

/**
 * Process the environment variable sections in the config and fill in the computed properties within it
 * @param {Config} config - the config object to process (will be mutated in-place)
 */
function processEnv (config: Config): void {
  // Grab the CI stuff from env
  config.computed.ci.buildNumber = nullthrows(getEnv(config.ci.env.buildNumber))
  config.computed.ci.prNumber = nullthrows(getEnv(config.ci.env.pr, 'false'))
  config.computed.ci.isPr = config.computed.ci.prNumber !== 'false'
  config.computed.ci.branch = nullthrows(getEnv(config.ci.env.branch, 'master'))

  const isPrStr = config.computed.ci.isPr ? 'true' : 'false'

  logger.log(`pr-bumper::config: prNumber [${config.computed.ci.prNumber}], isPr [${isPrStr}]`)

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
    password: ((getEnv(config.vcs.env.password): any): string),
    readToken: ((getEnv(config.vcs.env.readToken): any): string),
    username: ((getEnv(config.vcs.env.username): any): string),
    writeToken: ((getEnv(config.vcs.env.writeToken): any): string)
  }
}

/**
 * Read in the config from a file and apply defaults
 * @returns {Config} the config object
 */
export function getConfig (): Config {
  const leaves = {}
  let object = {}

  try {
    object = readJsonFile('.pr-bumper.json')
  } catch (e) {
    logger.log('No .pr-bumper.json found, using defaults')
  }

  walkObject('', defaultConfig, leaves)

  Object.keys(leaves).forEach((key: string) => {
    const value = leaves[key]
    if (__.get(object, key) === undefined) {
      __.set(object, key, value)
    }
  })

  const config: Config = ((object: any): Config) // eslint-disable-line

  processEnv(config)

  const pkgJson = readJsonFile('package.json')

  if (pkgJson && pkgJson['pr-bumper'] && pkgJson['pr-bumper'].coverage) {
    config.computed.baselineCoverage = pkgJson['pr-bumper'].coverage
  }

  return config
}

/**
 * Make sure scope is one of 'patch', 'minor', 'major', 'none' (or their aliases)
 *
 * @param {Object} params - the params object
 * @returns {String} the validated scope
 * @throws Error if scope is invalid
 */
export function getValidatedScope (params: {|
  maxScope: string, // the maximum scope allowed
  prNumber: number, // the # of the PR
  prUrl: string, // the url of the PR
  scope: string, // the scope to check
|}): string {
  const scope = params.scope
  const maxScope = params.maxScope || 'major'
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
}

/**
 * Extract the scope string ('patch', 'minor', 'major', 'none') from the PR object
 * @param {PullRequest} pr - the PR object
 * @param {String} maxScope - the max valid scope
 * @returns {String} the scope of the PR (from the pr description)
 * @throws Error if there is not a single, valid scope in the PR description
 */
export function getScopeForPr (pr: PullRequest, maxScope: string = 'major'): string {
  const matches = pr.description.match(/#[A-Za-z]+#/g)
  const prLink = `[PR #${pr.number}](${pr.url})`

  if (!matches) {
    const example = 'Please include a scope (e.g. `#major#`, `#minor#`, `#patch#`) in your PR description.'
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

  return getValidatedScope({
    scope: scope.toLowerCase(),
    maxScope,
    prNumber: pr.number,
    prUrl: pr.url
  })
}

/**
 * Extract the changelog string from the PR object
 * @param {PullRequest} pr - the PR object
 * @returns {String} the changelog of the PR (from the pr description, if one exists, else '')
 */
export function getChangelogForPr (pr: PullRequest): string {
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
}

/**
 * Get the current coverage stats from istanbul coverage-summary data
 * @param {Config} config - the config object
 * @returns {Number} the coverage line percentage
 */
export function getCurrentCoverage (config: Config): number {
  const file = nullthrows(config.features.coverage.file)
  const coverageSummary = readJsonFile(file)
  const totalStatements = __.get(coverageSummary, 'total.statements.total') || -1

  if (totalStatements === -1) {
    return -1
  }

  const coveredStatements = __.get(coverageSummary, 'total.statements.covered')
  const totalBranches = __.get(coverageSummary, 'total.branches.total') || -1
  const coveredBranches = __.get(coverageSummary, 'total.branches.covered')

  const pct = (coveredStatements + coveredBranches) / (totalStatements + totalBranches) * 100

  return Number(pct.toFixed(2)) // cut it off at two decimal points
}

/**
 * Maybe post a comment to the PR, if prComments is enabled
 * @param {Config} config - the bumper config
 * @param {Vcs} vcs - the vcs instance for the bumper
 * @param {String} msg - the message to post
 * @param {Boolean} isError - if true, prefix the msg with an ## ERROR heading
 * @returns {Promise} a promise resolved when success, rejected on error
 */
export function maybePostComment (config: Config, vcs: Vcs, msg: string, isError?: boolean): Promise<*> {
  if (!process.env['SKIP_COMMENTS'] && config.computed.ci.isPr && config.isEnabled('comments')) {
    const comment = isError ? `## ERROR\n${msg}` : msg
    return vcs.postComment(config.computed.ci.prNumber, comment)
      .catch((err: Error) => {
        const newMessage = `Received error: ${err.message} while trying to post PR comment: ${comment}`
        throw new Error(newMessage)
      })
  }

  return Promise.resolve()
}

/**
 * Maybe post a comment to the PR, if the function given throws an error, and prComments is enabled
 * @param {Config} config - the config for a bumper instance
 * @param {Vcs} vcs - the vcs instance for a bumper instance
 * @param {Function} func - the function to execute and check for errors on
 * @returns {Promise} a promise resolved if all goes well, rejected if an error is thrown
 */
export function maybePostCommentOnError (config: Config, vcs: Vcs, func: () => mixed): Promise<*> {
  let ret
  try {
    ret = func()
  } catch (e) {
    if (config.computed.ci.isPr && config.isEnabled('comments')) {
      return vcs.postComment(config.computed.ci.prNumber, `## ERROR\n${e.message}`)
        .then(() => {
          throw e
        })
        .catch((err: Error) => {
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

/**
 * Read in a JSON file and return the parsed json
 * @param {String} filename - the name of the file to read
 * @returns {Object} the json object
 */
export function readJsonFile (filename: string): Object { // eslint-disable-line
  const fullPath = path.join(process.cwd(), filename)
  return JSON.parse(fs.readFileSync(fullPath, {encoding: 'utf8'}))
}
