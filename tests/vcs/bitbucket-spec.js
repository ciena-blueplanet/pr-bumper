'use strict'

const chai = require('chai')
const deepFreeze = require('freezly').default
const rewire = require('rewire')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const expect = chai.expect
chai.use(sinonChai)

const logger = require('../../lib/logger')
const Bitbucket = rewire('../../lib/vcs/bitbucket')

const CONFIG = deepFreeze({
  ci: {
    gitUser: {
      email: 'bamboo@my-domain.com',
      name: 'bamboo'
    },
    provider: 'bamboo'
  },
  computed: {
    vcs: {
      auth: {
        username: 'ci-user',
        password: 'ci user password'
      }
    }
  },
  vcs: {
    domain: 'api.bitbucket.org',
    provider: 'bitbucket',
    repository: {
      name: 'repo',
      owner: 'owner'
    }
  }
})

describe('VCS / Bitbucket /', function () {
  let sandbox, bitbucket, fetchStub, revertFetchRewire

  beforeEach(function () {
    sandbox = sinon.sandbox.create()

    // get rid of all logging messages in the tests (and let us test for them if we want)
    sandbox.stub(logger, 'log')

    // stub out the top-level 'fetch'
    fetchStub = sandbox.stub()
    revertFetchRewire = Bitbucket.__set__('fetch', fetchStub)
    bitbucket = new Bitbucket(CONFIG)
  })

  afterEach(function () {
    revertFetchRewire()
    sandbox.restore()
  })

  it('should save the config', function () {
    expect(bitbucket.config).to.be.deep.equal(CONFIG)
  })

  it('should construct a 1.0 base URL', function () {
    const url = 'https://ci-user:ci%20user%20password@api.bitbucket.org/1.0'
    expect(bitbucket.baseUrl1).to.be.equal(url)
  })

  it('should construct a 2.0 base URL', function () {
    const url = 'https://ci-user:ci%20user%20password@api.bitbucket.org/2.0'
    expect(bitbucket.baseUrl2).to.be.equal(url)
  })

  describe('.addRemoteForPush()', function () {
    let remoteName
    beforeEach(function () {
      return bitbucket.addRemoteForPush().then((name) => {
        remoteName = name
      })
    })

    it('should resolve with origin', function () {
      expect(remoteName).to.be.equal('origin')
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
      promise = bitbucket.getPr('5')
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
      expect(fetchStub).to.have.been.calledWith(`${bitbucket.baseUrl2}/repositories/owner/repo/pullrequests/5`)
    })

    describe('when fetch resolves with success', function () {
      let resp
      beforeEach(function (done) {
        resp = {ok: true, status: 200, json () {}}
        let pr = {
          id: 5,
          description: 'This is a #fix#',
          source: {
            commit: {
              hash: 'sha-1'
            }
          },
          links: {
            self: {
              href: 'my-link-to-myself'
            }
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
        sandbox.stub(resp, 'json').returns(err)

        promise.catch(() => {
          done()
        })

        fetchResolver.resolve(resp)
      })

      it('should not resolve', function () {
        expect(resolution).to.equal(null)
      })

      it('should reject with the proper error', function () {
        expect(rejection).to.be.deep.equal(
          new Error(`https://api.bitbucket.org/2.0/repositories/owner/repo/pullrequests/5 400: ${JSON.stringify(err)}`)
        )
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
      promise = bitbucket.postComment('5', 'Missing PR scope!')
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
      const url = `${bitbucket.baseUrl1}/repositories/owner/repo/pullrequests/5/comments`
      expect(fetchStub).to.have.been.calledWith(url, {
        method: 'POST',
        body: 'content=Missing PR scope!'
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
      let resp
      beforeEach(function (done) {
        resp = {
          ok: false,
          status: 401,
          json () {
            return undefined
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
        expect(rejection).to.deep.equal(new Error('400: API 1.0 Error'))
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
