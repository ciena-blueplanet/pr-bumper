'use strict'

require('./typedefs')

const Promise = require('promise')

const Bumper = require('./bumper')
const logger = require('./logger')
const utils = require('./utils')

// VCS implementations
const BitbucketServer = require('./vcs/bitbucket-server')
const GitHub = require('./vcs/github')

// CI implementations
const TeamCity = require('./ci/teamcity')
const Travis = require('./ci/travis')

class Cli {

  /**
   * Run the specified command
   * @param {String} cmd - the command to run
   * @param {String} options - the command line options
   * @returns {Promise} a promise resolved when command finishes, or rejected with failure
   */
  run (cmd, options) {
    const config = utils.getConfig()
    const vcs = this._getVcs(config)
    const ci = this._getCi(config, vcs)
    const bumper = this._getBumper({ci, config, vcs})

    if (cmd === 'bump') {
      return bumper.bump(options)
    } else if (cmd === 'check') {
      return bumper.check()
    }

    return Promise.reject(`Invalid command: ${cmd}`)
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
    } else if (provider === 'github') {
      return new GitHub(config)
    }

    throw new Error(`Invalid vcs provider: [${provider}]`)
  }
}

module.exports = Cli
