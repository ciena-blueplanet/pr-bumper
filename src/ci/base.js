/**
 * @flow
 */

import {exec} from '../child_process'
import logger from '../logger'
import type {Config, Vcs} from '../typedefs'

/**
 * Base CI implementation to provide basic git functionality
 *
 * @class
 * @implements {Ci}
 */
export default class CiBase {
  config: Config
  vcs: Vcs

  /**
   * @param {Config} config - the configuration object
   * @param {Vcs} vcs - the vcs system being used
   */
  constructor (config: Config, vcs: Vcs): void {
    this.config = config
    this.vcs = vcs
  }

  /**
   * Add changed files
   *
   * @param {String[]} files - the files to add
   * @returns {Promise} - a promise resolved with result of git commands
   */
  add (files: string[]): Promise<*> {
    return exec(`git add ${files.join(' ')}`)
  }

  /**
   * Commit local changes
   *
   * @param {String} summary - the git commit summary
   * @param {String} message - the detailed commit message
   * @returns {Promise} - a promise resolved with result of git commands
   */
  commit (summary: string, message: string): Promise<*> {
    return exec(`git commit -m "${summary}" -m "${message}"`)
  }

  /**
   * Get the most recent commit message summary
   *
   * @returns {Promise} - a promise resolved with result of git command
   */
  getLastCommitMsg (): Promise<*> {
    return exec('git log --pretty=format:\'%s\' -1')
  }

  /**
   * Push local changes to remote repo
   * @returns {Promise} a promise resolved with the result of the push
   */
  push (): Promise<*> {
    return this.vcs.addRemoteForPush().then((remoteName: string) => {
      const branch = this.config.computed.ci.branch
      logger.log(`Pushing ${branch} to ${remoteName}`)
      return exec(`git push ${remoteName} ${branch} --tags`)
    })
  }

  /**
   * Prepare the git env (setting the user properly)
   * @returns {Promise} - a promise resolved with the results of the git commands
   */
  setupGitEnv (): Promise<*> {
    const user = this.config.ci.gitUser
    return exec(`git config --global user.email "${user.email}"`)
      .then(() => {
        return exec(`git config --global user.name "${user.name}"`)
      })
  }

  /**
   * Create a local tag
   *
   * @param {String} name - the name of the tag to create
   * @param {String} message - commit message of the tag being created
   * @returns {Promise} - a promise resolved with result of git commands
   */
  tag (name: string, message: string): Promise<*> {
    return exec(`git tag ${name} -a -m "${message}"`)
  }
}
