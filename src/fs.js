/**
 * @flow
 */

import fs, {type Stats} from 'fs'
import Promise from 'promise'
import {type URL} from 'url'

export const mkdir: (
  path: Buffer | string | URL,
  mode?: number
) => Promise<void, Error> = Promise.denodeify(fs.mkdir)

export const readFile: (
  filename: Buffer | number | string | URL,
  options?: string | {|
    encoding?: ?string,
    flag?: string
  |}
) => Promise<Buffer | string, Error> = Promise.denodeify(fs.readFile)

export const stat: (
  path: Buffer | string | URL
) => Promise<Stats, Error> = Promise.denodeify(fs.stat)

export const writeFile: (
  filename: Buffer | number | string,
  data: Buffer | string,
  options?: string | {|
    encoding?: ?string,
    flag?: string,
    mode?: number
  |}
) => Promise<void, Error> = Promise.denodeify(fs.writeFile)
