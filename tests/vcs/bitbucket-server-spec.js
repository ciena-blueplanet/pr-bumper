'use strict'

const chai = require('chai')
const rewire = require('rewire')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const expect = chai.expect
chai.use(sinonChai)

const logger = require('../../lib/logger')
const BitbucketServer = rewire('../../lib/vcs/bitbucket-server')

describe('BitbucketServer', function () {
  let sandbox, bitbucket, config, fetchStub, revertFetchRewire

  beforeEach(function () {
    sandbox = sinon.sandbox.create()

    // get rid of all logging messages in the tests (and let us test for them if we want)
    sandbox.stub(logger, 'log')

    // stub out the top-level 'fetch'
    fetchStub = sandbox.stub()
    revertFetchRewire = BitbucketServer.__set__('fetch', fetchStub)

    config = {
      ci: {
        gitUser: {
          email: 'teamcity@my-domain.com',
          name: 'teamcity'
        },
        provider: 'teamcity'
      },
      owner: 'me',
      repo: 'my-repo',
      vcs: {
        auth: {
          username: 'ci-user',
          password: 'ci user password'
        },
        domain: 'bitbucket.my-domain.com',
        provider: 'bitbucket-server'
      }
    }

    bitbucket = new BitbucketServer(config)
  })

  afterEach(function () {
    revertFetchRewire()
    sandbox.restore()
  })

  it('should save the config', function () {
    expect(bitbucket.config).to.be.eql(config)
  })

  it('should construct a base URL', function () {
    const url = 'https://ci-user:ci%20user%20password@bitbucket.my-domain.com/rest/api/1.0'
    expect(bitbucket.baseUrl).to.be.equal(url)
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
      expect(fetchStub).to.have.been.calledWith(`${bitbucket.baseUrl}/projects/me/repos/my-repo/pull-requests/5`)
    })

    describe('when fetch succeeds', function () {
      let resp
      beforeEach(function (done) {
        resp = {ok: true, status: 200, json: function () {}}
        let pr = {
          id: 5,
          description: 'This is a #fix#',
          fromRef: {
            latestCommit: 'sha-1'
          },
          links: {
            self: [
              {href: 'my-link-to-myself'}
            ]
          }
        }
        sandbox.stub(resp, 'json').returns(Promise.resolve(pr))

        promise.then(() => {
          done()
        })

        fetchResolver.resolve(resp)
      })

      it('should resolve with the correct PR', function () {
        expect(resolution).to.be.eql({
          description: 'This is a #fix#',
          headSha: 'sha-1',
          number: 5,
          url: 'my-link-to-myself'
        })
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

  describe('.addRemoteForPush()', function () {
    let remoteName
    beforeEach(function () {
      return bitbucket.addRemoteForPush().then((name) => {
        remoteName = name
      })
    })

    it('should resolve with oritin', function () {
      expect(remoteName).to.be.equal('origin')
    })
  })
})
