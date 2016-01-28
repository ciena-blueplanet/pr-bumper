#!/usr/bin/env node

'use strict'

require('./lib/typedefs')
const program = require('commander')
const pkgJson = require('../package.json')
const lib = require('../lib')

/**
 * Get the bumper instance from the options
 * @param {Object} options - the options
 * @param {String} options.owner - the repository owner/org/project
 * @param {String} options.repo - the repository name
 * @returns {Bumper} the bumper instance
 */
function getBumper (options) {
  const vcs = new lib.GitHub(options.owner, options.repo)
  return new lib.Bumper(vcs)
}

program
  .version(pkgJson.version)
  .option('-o, --owner [value]', 'The repository owner/project')
  .option('-r, --repo [value]', 'The repository name')

program
  .command('bump')
  .action((options) => {
    const bumper = getBumper(options)
    bumper.getMergedPrScope()
      .then((scope) => {
        console.log(`Applying a ${scope} bump (except it's not implemente yet)`)
      })
  })

program
  .command('check')
  .action((options) => {
    const bumper = getBumper(options)
    bumper.getOpenPrScope()
      .then((scope) => {
        console.log(`Found a ${scope} bump for the current PR`)
      })
  })

program.parse(process.argv)
