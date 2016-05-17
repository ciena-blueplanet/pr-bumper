#!/usr/bin/env node

'use strict'

require('../lib/typedefs')
const program = require('commander')
const pkgJson = require('../package.json')
const lib = require('../lib')

let cmd = ''

program
  .version(pkgJson.version)

program
  .command('bump')
  .action(() => {
    cmd = 'bump'
  })

program
  .command('check')
  .action(() => {
    cmd = 'check'
  })

program.parse(process.argv)

const config = lib.utils.getConfig()

let vcs = new lib.GitHub(config)

/*
if (config.bitbucket) {
  vcs = new lib.BitbucketServer(config)
} else {
  vcs = new lib.GitHub(config)
}
*/

const bumper = new lib.Bumper(vcs, config)

switch (cmd) {
  case 'bump':
    bumper
      .bump()
      .catch((error) => {
        const msg = (error.message) ? error.message : error
        console.log(msg)
        process.exit(1)
      })
    break
  case 'check':
    bumper
      .check()
      .catch((error) => {
        const msg = (error.message) ? error.message : error
        console.log(msg)
        process.exit(1)
      })
    break
  default:
    program.help()
    break
}
