'use strict'

const rewire = require('rewire')
const sinon = require('sinon')
const expect = require('chai').expect
const logger = require('../lib/logger')
const GitHub = rewire('../lib/github')

describe('GitHub', () => {
  let env, sandbox, github, execStub, fetchStub, revertFetchRewire, revertExecRewire
  beforeEach(() => {
    sandbox = sinon.sandbox.create()

    // get rid of all logging messages in the tests (and let us test for them if we want)
    sandbox.stub(logger, 'log')

    // stub out the top-level 'fetch'
    fetchStub = sandbox.stub()
    revertFetchRewire = GitHub.__set__('fetch', fetchStub)

    // stub out the top-level 'exec'
    execStub = sandbox.stub()
    revertExecRewire = GitHub.__set__('exec', execStub)

    // save the current env variables
    env = {
      roGhToken: process.env.RO_GH_TOKEN,
      githubToken: process.env.GITHUB_TOKEN,
      verbose: process.env.VERBOSE
    }

    process.env.RO_GH_TOKEN = 'my-ro-gh-token'
    process.env.VERBOSE = '1'
    process.env.GITHUB_TOKEN = 'my-gh-token'

    github = new GitHub({owner: 'me', repo: 'my-repo'})
  })

  afterEach(() => {
    // restore the real env variables
    process.env.RO_GH_TOKEN = env.roGhToken
    process.env.GITHUB_TOKEN = env.githubToken
    process.env.VERBOSE = env.verbose

    // undo the rewiring
    revertFetchRewire()
    revertExecRewire()

    // remove all stubs/spies
    sandbox.restore()
  })

  it('saves the config', () => {
    expect(github.config).to.be.eql({owner: 'me', repo: 'my-repo'})
  })

  describe('.getOpenPrForSha()', () => {
    let resolution, rejection, promise, fetchResolver
    beforeEach(() => {
      fetchResolver = {}
      let fetchPromise = new Promise((resolve, reject) => {
        fetchResolver.resolve = resolve
        fetchResolver.reject = reject
      })

      fetchStub.returns(fetchPromise)

      promise = github.getOpenPrForSha('sha-3')
        .then((resp) => {
          resolution = resp
          return resolution
        })
        .catch((err) => {
          rejection = err
          throw err
        })
    })

    it('calls fetch with proper params', () => {
      expect(fetchStub.lastCall.args).to.be.eql([
        'https://api.github.com/repos/me/my-repo/pulls',
        {
          headers: {
            'Authorization': 'token my-ro-gh-token'
          }
        }
      ])
    })

    describe('when fetch succeeds', () => {
      let resp
      beforeEach((done) => {
        resp = {ok: true, status: 200, json: function () {}}
        let prs = [
          {
            number: 1,
            body: 'This is a #fix#',
            'html_url': '',
            'merge_commit_sha': 'sha-1',
            head: {
              sha: 'sha-2'
            }
          },
          {
            number: 2,
            body: 'This is a #feature#',
            'html_url': '',
            'merge_commit_sha': 'sha-3',
            head: {
              sha: 'sha-4'
            }
          },
          {
            number: 3,
            body: 'This is a #breaking# change',
            'html_url': '',
            'merge_commit_sha': 'sha-5',
            head: {
              sha: 'sha-6'
            }
          }
        ]
        sandbox.stub(resp, 'json').returns(Promise.resolve(prs))

        promise.then(() => {
          done()
        })

        fetchResolver.resolve(resp)
      })

      it('resolves with the correct PR', () => {
        expect(resolution).to.be.eql({
          description: 'This is a #feature#',
          headSha: 'sha-4',
          mergeCommitSha: 'sha-3',
          number: 2,
          url: ''
        })
      })
    })

    describe('when fetch errors', () => {
      beforeEach((done) => {
        promise.catch(() => {
          done()
        })

        fetchResolver.reject('my-error')
      })

      it('passes up the error', () => {
        expect(rejection).to.be.equal('my-error')
      })
    })
  })

  describe('.getPr()', () => {
    let resolution, rejection, promise, fetchResolver
    beforeEach(() => {
      fetchResolver = {}
      let fetchPromise = new Promise((resolve, reject) => {
        fetchResolver.resolve = resolve
        fetchResolver.reject = reject
      })

      fetchStub.returns(fetchPromise)

      promise = github.getPr('5')
        .then((resp) => {
          resolution = resp
          return resolution
        })
        .catch((err) => {
          rejection = err
          throw err
        })
    })

    it('calls fetch with proper params', () => {
      expect(fetchStub.lastCall.args).to.be.eql([
        'https://api.github.com/repos/me/my-repo/pulls/5',
        {
          headers: {
            'Authorization': 'token my-ro-gh-token'
          }
        }
      ])
    })

    describe('when fetch succeeds', () => {
      let resp
      beforeEach((done) => {
        resp = {ok: true, status: 200, json: function () {}}
        let pr = {
          number: 5,
          body: 'This is a #fix#',
          'html_url': '',
          'merge_commit_sha': 'sha-1',
          head: {
            sha: 'sha-2'
          }
        }
        sandbox.stub(resp, 'json').returns(Promise.resolve(pr))

        promise.then(() => {
          done()
        })

        fetchResolver.resolve(resp)
      })

      it('resolves with the correct PR', () => {
        expect(resolution).to.be.eql({
          description: 'This is a #fix#',
          headSha: 'sha-2',
          mergeCommitSha: 'sha-1',
          number: 5,
          url: ''
        })
      })
    })

    describe('when fetch errors', () => {
      beforeEach((done) => {
        promise.catch(() => {
          done()
        })

        fetchResolver.reject('my-error')
      })

      it('passes up the error', () => {
        expect(rejection).to.be.equal('my-error')
      })
    })
  })

  describe('.push()', () => {
    beforeEach((done) => {
      execStub.returns(Promise.resolve())
      github.push().then(() => {
        done()
      })
    })

    it('makes the proper git remote command', () => {
      const url = 'https://my-gh-token@github.com/me/my-repo'
      expect(execStub.firstCall.args).to.be.eql([`git remote add my-origin ${url}`])
    })

    it('makes the proper git push command', () => {
      expect(execStub.secondCall.args).to.be.eql(['git push my-origin my-master:refs/heads/master --tags'])
    })
  })
})
