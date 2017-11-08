/**
 * @flow
 */

import __ from 'lodash'
import nullthrows from 'nullthrows'
import Promise from 'promise'

import Bumper from './bumper'
import TeamCity from './ci/teamcity'
import Travis from './ci/travis'
import logger from './logger'
import type {Ci, Config, Vcs} from './typedefs'
import * as utils from './utils'
import BitbucketServer from './vcs/bitbucket-server'
import GitHub from './vcs/github'
import GitHubEnterprise from './vcs/github-enterprise'

export default class Cli {
  /**
   * Run the specified command
   * @param {String} cmd - the command to run
   * @param {Boolean} [skipComments] - true if the command line options specified we need to skip pr comments
   * @returns {Promise} a promise resolved when command finishes, or rejected with failure
   */
  run (cmd: string, skipComments: boolean): Promise<*> {
    const config = utils.getConfig()
    if (skipComments) {
      __.set(config, 'features.comments.enabled', false)
    }
    const vcs = this._getVcs(config)
    const ci = this._getCi(config, vcs)
    const bumper = this._getBumper({ci, config, vcs})

    switch (cmd) {
      case 'bump':
        return bumper.bump()

      case 'check':
        return bumper.check()

      case 'check-coverage':
        return bumper.checkCoverage()

      default:
        // eslint-disable-next-line
        return Promise.reject(`Invalid command: ${cmd}`)
    }
  }

  /**
   * Simple wrapper around creation of bumper to make it easier to test
   *
   * @param {Object} params - params obj
   * @returns {Bumper} the bumper intance
   */
  _getBumper (params: {|
    ci: Ci,
    config: Config,
    vcs: Vcs
  |}): Object {
    return new Bumper(params)
  }

  /**
   * Get the ci instance to use based on the config
   * @param {Config} config - the pr-bumper config
   * @param {Vcs} vcs - the vcs instance
   * @returns {Ci} the ci instance
   * @throws Error when invalid provider given
   */
  _getCi (config: Config, vcs: Vcs): Ci {
    const provider = nullthrows(config.ci.provider)

    logger.log(`Detected CI provider: ${provider} `)

    switch (provider) {
      case 'teamcity':
        return new TeamCity(config, vcs)

      case 'travis':
        return new Travis(config, vcs)

      default:
        throw new Error(`Invalid ci provider: [${provider}]`)
    }
  }

  /**
   * Get the vcs instance to use based on the config
   * @param {Config} config - the pr-bumper config
   * @returns {Vcs} the vcs instance
   * @throws Error when invalid provider given
   */
  _getVcs (config: Config): Vcs {
    const provider = config.vcs.provider

    logger.log(`Detected VCS provider: ${provider} `)

    switch (provider) {
      case 'bitbucket-server':
        return new BitbucketServer(config)

      case 'github':
        return new GitHub(config)

      case 'github-enterprise':
        return new GitHubEnterprise(config)

      default:
        throw new Error(`Invalid vcs provider: [${provider}]`)
    }
  }
}
