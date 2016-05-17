'use strict'

const rewire = require('rewire')
const sinon = require('sinon')
const expect = require('chai').expect
const logger = require('../../lib/logger')
const BitbucketServer = rewire('../../lib/vcs/bitbucket-server')

describe('BitbucketServer', () => {
  let sandbox, bitbucket, config, fetchStub, revertFetchRewire
  beforeEach(() => {
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

  afterEach(() => {
    // undo the rewiring
    revertFetchRewire()

    // remove all stubs/spies
    sandbox.restore()
  })

  it('saves the config', () => {
    expect(bitbucket.config).to.be.eql(config)
  })

  it('constructs a base URL', () => {
    const url = 'https://ci-user:ci%20user%20password@bitbucket.my-domain.com/rest/api/1.0'
    expect(bitbucket.baseUrl).to.be.equal(url)
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

    it('calls fetch with proper params', () => {
      expect(fetchStub.lastCall.args).to.be.eql([
        `${bitbucket.baseUrl}/projects/me/repos/my-repo/pull-requests/5`
      ])
    })

    describe('when fetch succeeds', () => {
      let resp
      beforeEach((done) => {
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
      return bitbucket.addRemoteForPush().then((name) => {
        remoteName = name
      })
    })

    it('resolves with oritin', () => {
      expect(remoteName).to.be.equal('origin')
    })
  })
})
