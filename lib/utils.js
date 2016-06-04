'use strict'

require('./typedefs')

const path = require('path')
const __ = require('lodash')

const logger = require('./logger')

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
 * Process the environment variable sections in the config and fill in the computed properties within it
 * @param {Config} config - the config object to process (will be mutated in-place)
 */
function processEnv (config) {
  // Grab the CI stuff from env
  config.ci.buildNumber = process.env[config.ci.env.buildNumber]
  config.prNumber = process.env[config.ci.env.pr]
  config.isPr = config.prNumber !== 'false'

  logger.log(`pr-bumper::config: prNumber [${config.prNumber}], isPr [${config.isPr}]`)

  // Fill in the owner/repo from the repo slug in env if necessary
  const repoSlug = process.env[config.ci.env.repoSlug]

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
    password: process.env[config.vcs.env.password],
    readToken: process.env[config.vcs.env.readToken],
    username: process.env[config.vcs.env.username],
    writeToken: process.env[config.vcs.env.writeToken]
  }
}

const utils = {
  /**
   * Read in the config from a file and apply defaults
   * @param {Config} [_config] - the configuration for the pr-bumper
   * @returns {Config} the config object
   */
  getConfig (_config) {
    let config = _config || {}

    try {
      config = require(path.join(process.cwd(), '.pr-bumper.json'))
    } catch (e) {
      logger.log('No .pr-bumper.json found, using defaults')
    }

    __.defaults(config, {
      ci: {
        env: {
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
      vcs: {
        domain: 'github.com',
        env: {
          readToken: 'RO_GH_TOKEN',
          writeToken: 'GITHUB_TOKEN'
        },
        provider: 'github'
      },
      prependChangelog: true
    })

    processEnv(config)

    return config
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
        throw new Error(`Too many version-bump scopes found for PR #${pr.number} (${pr.url})`)
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
    const defaultMsg = 'No CHANGELOG section found in Pull Request description.\n' +
      'Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`'

    const lines = pr.description.split('\n')
    let index = -1
    let changelog = ''
    try {
      index = getChangelogSectionIndex(lines)
    } catch (e) {
      return `${defaultMsg}\n${e.message}`
    }

    if (index < 0) {
      changelog = defaultMsg
    } else {
      changelog = lines.slice(index + 1).join('\n')
    }

    return changelog
  }
}

module.exports = utils
