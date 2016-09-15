'use strict'

const rewire = require('rewire')
const sinon = require('sinon')
const expect = require('chai').expect
const logger = require('../../lib/logger')
const GitHub = rewire('../../lib/vcs/github')

describe('GitHub', () => {
  let config, sandbox, github, execStub, fetchStub, revertFetchRewire, revertExecRewire
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

    config = {
      ci: {
        gitUser: {
          email: 'travis-ci-ciena@gmail.com',
          name: 'travis-ci'
        },
        provider: 'travis'
      },
      owner: 'me',
      repo: 'my-repo',
      branch: 'my-branch',
      vcs: {
        auth: {
          readToken: 'my-ro-gh-token',
          writeToken: 'my-gh-token'
        },
        provider: 'github'
      }
    }

    github = new GitHub(config)
  })

  afterEach(() => {
    // undo the rewiring
    revertFetchRewire()
    revertExecRewire()

    // remove all stubs/spies
    sandbox.restore()
  })

  it('saves the config', () => {
    expect(github.config).to.be.eql(config)
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
          'html_url': 'my-link-to-myself',
          head: {
            sha: 'sha-1'
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
          headSha: 'sha-1',
          number: 5,
          url: 'my-link-to-myself'
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

  describe('.addRemoteForPush()', () => {
    let remoteName
    beforeEach(() => {
      execStub.returns(Promise.resolve())
      return github.addRemoteForPush().then((name) => {
        remoteName = name
      })
    })

    it('makes the proper git remote command', () => {
      const url = 'https://my-gh-token@github.com/me/my-repo'
      expect(execStub.firstCall.args).to.be.eql([`git remote add ci-origin ${url}`])
    })

    it('resolves with the proper remote name', () => {
      expect(remoteName).to.be.equal('ci-origin')
    })
  })
})
