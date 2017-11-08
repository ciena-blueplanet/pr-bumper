/**
 * @flow
 */

import {exec} from '../child_process'
import logger from '../logger'
import '../typedefs'
import CiBase from './base'

/**
 * CI interface for public Travis (travis-ci.org)
 *
 * @class
 * @implements {Ci}
 */
export default class Travis extends CiBase {
  /**
   * Push local changes to GitHub
   * @returns {Promise} a promise resolved with the result of the push
   */
  push (): Promise<*> {
    const branch = this.config.computed.ci.branch
    return this.vcs.addRemoteForPush()
      .then((remoteName: string) => {
        logger.log(`Pushing ci-${branch} to ${remoteName}`)
        return exec(`git push ${remoteName} ci-${branch}:refs/heads/${branch} --tags`)
      })
  }

  /**
   * Prepare the git env within travis-ci
   * @returns {Promise} - a promise resolved with the results of the git commands
   */
  setupGitEnv (): Promise<*> {
    const branch = this.config.computed.ci.branch
    return super.setupGitEnv()
      .then(() => {
        return exec(`git checkout -b ci-${branch}`)
      })
  }
}
