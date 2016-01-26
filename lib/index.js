'use strict';

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

  getPrForSha(owner, repo, sha) {
    return new Promise((resolve, reject) => {
      client.get('/repos/:owner/:repo/pulls', {owner, repo}, (err, res) => {
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

module.exports = lib;
