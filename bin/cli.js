#!/usr/bin/env node

'use strict'

const program = require('commander')
const pkgJson = require('../package.json')
const Cli = require('../lib/cli')

const cli = new Cli()

program
  .version(pkgJson.version)
  .arguments('<cmd>')
  .action((cmd, options) => {
    cli
      .run(cmd, options)
      .catch((error) => {
        const msg = (error.message) ? error.message : error
        console.log(msg)
        process.exit(1)
      })
  })
  .on('--help', () => {
    console.log('  Commands:')
    console.log('')
    console.log('    check - verify an open PR has a version-bump comment')
    console.log('    bump - actually bump the version based on the merged PR')
    console.log('')
  })
  .parse(process.argv)
