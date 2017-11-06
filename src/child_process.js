/**
 * @flow
 */

import childProcess from 'child_process'
import Promise from 'promise'

export const exec: (
  command: string,
  options?: child_process$execOpts // eslint-disable-line
) => Promise<string, Error> = Promise.denodeify(childProcess.exec)
