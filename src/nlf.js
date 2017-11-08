/**
 * @flow
 */

import nlf from 'nlf'
import Promise from 'promise'

type NlfFindOptions = {|
  directory: string,
  production?: boolean
|}

type NlfSource = {|
  filePath: string,
  name: string,
  text: string
|}

type NlfSources = {|
  sources: NlfSource[]
|}

type NlfPackageSource = {|
  license: string,
  url: string
|}

type NlfModuleLicenseSources = {|
  license: NlfSources,
  package: {|
    sources: NlfPackageSource
  |},
  readme: NlfSources
|}

type NlfModule = {|
  directory: string,
  id: string,
  licenseSources: NlfModuleLicenseSources,
  name: string,
  repository: string,
  version: string
|}

export const find: (NlfFindOptions) => Promise<NlfModule[], Error> = Promise.denodeify(nlf.find)
