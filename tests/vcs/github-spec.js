'use strict'

const chai = require('chai')
const deepFreeze = require('freezly').default
const rewire = require('rewire')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const expect = chai.expect
chai.use(sinonChai)

const logger = require('../../lib/logger')
const GitHub = rewire('../../lib/vcs/github')

const CONFIG = deepFreeze({
  ci: {
    gitUser: {
      email: 'travis-ci-ciena@gmail.com',
      name: 'travis-ci'
    },
    provider: 'travis'
  },
  computed: {
    ci: {
      branch: 'my-branch'
    },
    vcs: {
      auth: {
        readToken: 'my-ro-gh-token',
        writeToken: 'my-gh-token'
      }
    }
  },
  vcs: {
    provider: 'github',
    repository: {
      name: 'my-repo',
      owner: 'me'
    }
  }
})

describe('VCS / GitHub /', function () {
  let sandbox, github, execStub, fetchStub, revertFetchRewire, revertExecRewire
  beforeEach(function () {
    sandbox = sinon.sandbox.create()

    // get rid of all logging messages in the tests (and let us test for them if we want)
    sandbox.stub(logger, 'log')

    // stub out the top-level 'fetch'
    fetchStub = sandbox.stub()
    revertFetchRewire = GitHub.__set__('fetch', fetchStub)

    // stub out the top-level 'exec'
    execStub = sandbox.stub()
    revertExecRewire = GitHub.__set__('exec', execStub)
    github = new GitHub(CONFIG)
  })

  afterEach(function () {
    revertFetchRewire()
    revertExecRewire()

    sandbox.restore()
  })

  it('should save the config', function () {
    expect(github.config).to.be.deep.equal(CONFIG)
  })

  describe('.addRemoteForPush()', function () {
    let remoteName
    beforeEach(function () {
      execStub.returns(Promise.resolve())
      return github.addRemoteForPush().then((name) => {
        remoteName = name
      })
    })

    it('should makes the proper git remote command', function () {
      const url = 'https://my-gh-token@github.com/me/my-repo'
      expect(execStub.firstCall.args).to.be.deep.equal([`git remote add ci-origin ${url}`])
    })

    it('should resolve with the proper remote name', function () {
      expect(remoteName).to.be.equal('ci-origin')
    })
  })

  describe('.getPr()', function () {
    let resolution, rejection, promise, fetchResolver
    beforeEach(function () {
      fetchResolver = {}
      let fetchPromise = new Promise((resolve, reject) => {
        fetchResolver.resolve = resolve
        fetchResolver.reject = reject
      })

      fetchStub.returns(fetchPromise)

      resolution = rejection = null
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

    it('should call fetch with proper params', function () {
      expect(fetchStub).to.have.been.calledWith(
        'https://api.github.com/repos/me/my-repo/pulls/5',
        {
          headers: {
            'Authorization': 'token my-ro-gh-token'
          }
        }
      )
    })

    describe('when fetch resolves with success', function () {
      let resp
      beforeEach(function (done) {
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

      it('should resolve with the correct PR', function () {
        expect(resolution).to.be.deep.equal({
          description: 'This is a #fix#',
          headSha: 'sha-1',
          number: 5,
          url: 'my-link-to-myself'
        })
      })
    })

    describe('when fetch resolves with error', function () {
      let resp, err
      beforeEach(function (done) {
        resp = {ok: false, status: 400, json () {}}
        err = {
          message: 'Uh oh'
        }
        sandbox.stub(resp, 'json').returns(Promise.resolve(err))

        promise.catch(() => {
          done()
        })

        fetchResolver.resolve(resp)
      })

      it('should not resolve', function () {
        expect(resolution).to.equal(null)
      })

      it('should reject with the proper error', function () {
        expect(rejection).to.be.deep.equal(new Error(`400: ${JSON.stringify(err)}`))
      })
    })

    describe('when fetch errors', function () {
      beforeEach(function (done) {
        promise.catch(() => {
          done()
        })

        fetchResolver.reject('my-error')
      })

      it('should pass up the error', function () {
        expect(rejection).to.be.equal('my-error')
      })
    })
  })

  describe('.postComment()', function () {
    let resolution, rejection, promise, fetchResolver
    beforeEach(function () {
      fetchResolver = {}
      let fetchPromise = new Promise((resolve, reject) => {
        fetchResolver.resolve = resolve
        fetchResolver.reject = reject
      })

      fetchStub.returns(fetchPromise)

      resolution = rejection = null
      promise = github.postComment('5', 'Missing PR scope!')
        .then((resp) => {
          resolution = resp
          return resolution
        })
        .catch((err) => {
          rejection = err
          throw err
        })
    })

    it('should call fetch with proper params', function () {
      const url = 'https://api.github.com/repos/me/my-repo/issues/5/comments'
      expect(fetchStub).to.have.been.calledWith(url, {
        method: 'POST',
        body: JSON.stringify({body: 'Missing PR scope!'}),
        headers: {'Content-Type': 'application/json'}
      })
    })

    describe('when fetch resolves with success', function () {
      beforeEach(function (done) {
        promise.then(() => {
          done()
        })
        fetchResolver.resolve({ok: true})
      })

      it('should resolve', function () {
        expect(resolution).to.equal(undefined)
      })
    })

    describe('when fetch resolves with error', function () {
      let resp, err
      beforeEach(function (done) {
        err = {message: 'Uh oh'}
        resp = {
          ok: false,
          status: 400,
          json () {
            return err
          }
        }
        promise.catch(() => {
          done()
        })
        fetchResolver.resolve(resp)
      })

      it('should not resolve', function () {
        expect(resolution).to.equal(null)
      })

      it('should reject with proper error', function () {
        expect(rejection).to.deep.equal(new Error(`400: ${JSON.stringify(err)}`))
      })
    })

    describe('when fetch rejects', function () {
      beforeEach(function (done) {
        promise.catch(() => {
          done()
        })
        fetchResolver.reject('Uh oh')
      })

      it('should not resolve', function () {
        expect(resolution).to.equal(null)
      })

      it('should reject with proper error', function () {
        expect(rejection).to.equal('Uh oh')
      })
    })
  })
})
