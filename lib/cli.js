'use strict'

require('./typedefs')

const __ = require('lodash')
const Promise = require('promise')

const Bumper = require('./bumper')
const logger = require('./logger')
const utils = require('./utils')

// VCS implementations
const BitbucketServer = require('./vcs/bitbucket-server')
const Bitbucket = require('./vcs/bitbucket')
const GitHub = require('./vcs/github')
const GitHubEnterprise = require('./vcs/github-enterprise')

// CI implementations
const TeamCity = require('./ci/teamcity')
const Travis = require('./ci/travis')
const Bamboo = require('./ci/bamboo')

class Cli {
  /**
   * Run the specified command
   * @param {String} cmd - the command to run
   * @param {Boolean} [skipComments] - true if the command line options specified we need to skip pr comments
   * @returns {Promise} a promise resolved when command finishes, or rejected with failure
   */
  run (cmd, skipComments) {
    const config = utils.getConfig()
    if (skipComments) {
      __.set(config, 'features.comments.enabled', false)
    }
    const vcs = this._getVcs(config)
    const ci = this._getCi(config, vcs)
    const bumper = this._getBumper({ci, config, vcs})

    if (cmd === 'bump') {
      return bumper.bump()
    } else if (cmd === 'check') {
      return bumper.check()
    } else if (cmd === 'check-coverage') {
      return bumper.checkCoverage()
    }

    return Promise.reject(`Invalid command: ${cmd}`) // eslint-disable-line prefer-promise-reject-errors
  }

  /**
   * Simple wrapper around creation of bumper to make it easier to test
   *
   * @param {Object} params - params obj
   * @param {Config} params.config - the config object
   * @param {Vcs} params.vcs - the vcs instance
   * @param {Ci} params.ci - the ci instance
   * @returns {Bumper} the bumper intance
   */
  _getBumper (params) {
    return new Bumper(params)
  }

  /**
   * Get the ci instance to use based on the config
   * @param {Config} config - the pr-bumper config
   * @param {Vcs} vcs - the vcs instance
   * @returns {Ci} the ci instance
   * @throws Error when invalid provider given
   */
  _getCi (config, vcs) {
    const provider = config.ci.provider
    logger.log(`Detected CI provider: ${provider} `)

    if (provider === 'teamcity') {
      return new TeamCity(config, vcs)
    } else if (provider === 'travis') {
      return new Travis(config, vcs)
    } else if (provider === 'bamboo') {
      return new Bamboo(config, vcs)
    }

    throw new Error(`Invalid ci provider: [${provider}]`)
  }

  /**
   * Get the vcs instance to use based on the config
   * @param {Config} config - the pr-bumper config
   * @returns {Vcs} the vcs instance
   * @throws Error when invalid provider given
   */
  _getVcs (config) {
    const provider = config.vcs.provider
    logger.log(`Detected VCS provider: ${provider} `)

    if (provider === 'bitbucket-server') {
      return new BitbucketServer(config)
    } else if (provider === 'bitbucket') {
      return new Bitbucket(config)
    } else if (provider === 'github') {
      return new GitHub(config)
    } else if (provider === 'github-enterprise') {
      return new GitHubEnterprise(config)
    }

    throw new Error(`Invalid vcs provider: [${provider}]`)
  }
}

module.exports = Cli
