#!/usr/bin/env node

'use strict'

require('../lib/typedefs')
const program = require('commander')
const pkgJson = require('../package.json')
const lib = require('../lib')

let cmd = ''

program
  .version(pkgJson.version)
  .option('-o, --owner [value]', 'The repository owner/project')
  .option('-r, --repo [value]', 'The repository name')

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

let travisOwner
let travisRepo
if (process.env.TRAVIS_REPO_SLUG) {
  const parts = process.env.TRAVIS_REPO_SLUG.split('/')
  travisOwner = parts[0]
  travisRepo = parts[1]
}

const owner = program.owner || travisOwner
const repo = program.repo || travisRepo

const vcs = new lib.GitHub(owner, repo)
const bumper = new lib.Bumper(vcs)

switch (cmd) {
  case 'bump':
    bumper
      .bump()
      .catch((error) => {
        console.log(error.message)
        process.exit(1)
      })
    break
  case 'check':
    bumper
      .check()
      .catch((error) => {
        console.log(error.message)
        process.exit(1)
      })
    break
  default:
    program.help()
    break
}
