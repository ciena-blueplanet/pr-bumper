const github = require('github-basic')
const client = github({version: 3})
const Promise = require('promise')
const cpExec = require('child_process').exec
const exec = Promise.denodeify(cpExec)
const __ = require('lodash')

const lib = {
  getSha() {
    return exec('git log -1 --format="%H"').then((stdout) => {
      return stdout.replace('\n', '')
    })
  },

  getPrForSha(sha) {
    return new Promise((resolve, reject) => {
      data = {owner: 'ciena-blueplanet', repo: 'github-pr-bump'}
      client.get('/repos/:owner/:repo/pulls', data, (err, res) => {
        if (err) {
          reject(err)
        } else {
          const pr = __.find(res, {'merge_commit_sha': sha})
          if (!pr) {
            reject(`No PR found for sha [${sha}]`)
          } else {
            resolve(pr)
          }
        }
      })
    })
  },
}



lib.getSha()
  .then(lib.getPrForSha)
  .then((pr) => {
    console.log(`${JSON.stringify(pr, null, 2)}`)
  })
  .catch((e) => {
    console.log(e)
  })

/*
client.get('/repos/:owner/:repo/pulls', {owner: 'ciena-frost', repo: 'ember-frost-button'}, (err, res) => {
  console.log(`err: ${err}`)
  console.log(`res: ${JSON.stringify(res, null, 2)}`)
})
*/

module.exports = lib;

