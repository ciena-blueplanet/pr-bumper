jest.mock('node-fetch')
jest.mock('../../src/logger')

import fetch from 'node-fetch'
import BitbucketServer from '../../src/vcs/bitbucket-server'

describe('VCS / BitbucketServer /', () => {
  let bitbucket, config

  beforeEach(() => {
    config = {
      ci: {
        gitUser: {
          email: 'teamcity@my-domain.com',
          name: 'teamcity'
        },
        provider: 'teamcity'
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
        domain: 'bitbucket.my-domain.com',
        provider: 'bitbucket-server',
        repository: {
          name: 'my-repo',
          owner: 'me'
        }
      }
    }

    bitbucket = new BitbucketServer(config)
  })

  it('should save the config', () => {
    expect(bitbucket.config).toEqual(config)
  })

  it('should construct a base URL', () => {
    const url = 'https://ci-user:ci%20user%20password@bitbucket.my-domain.com/rest/api/1.0'
    expect(bitbucket.baseUrl).toBe(url)
  })

  describe('.addRemoteForPush()', () => {
    let remoteName

    beforeEach(() => {
      return bitbucket.addRemoteForPush().then(name => {
        remoteName = name
      })
    })

    it('should resolve with oritin', () => {
      expect(remoteName).toBe('origin')
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

      fetch.mockReturnValue(fetchPromise)

      resolution = rejection = null
      promise = bitbucket.getPr('5')
        .then(resp => {
          resolution = resp
          return resolution
        })
        .catch(err => {
          rejection = err
          throw err
        })
    })

    it('should call fetch with proper params', () => {
      expect(fetch).toHaveBeenCalledWith(`${bitbucket.baseUrl}/projects/me/repos/my-repo/pull-requests/5`)
    })

    describe('when fetch resolves with success', () => {
      let resp

      beforeEach(done => {
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

        resp = {
          json: jest.fn().mockReturnValue(Promise.resolve(pr)),
          ok: true,
          status: 200
        }

        promise.then(() => {
          done()
        })

        fetchResolver.resolve(resp)
      })

      it('should resolve with the correct PR', () => {
        expect(resolution).toEqual({
          description: 'This is a #fix#',
          headSha: 'sha-1',
          number: 5,
          url: 'my-link-to-myself'
        })
      })
    })

    describe('when fetch resolves with error', () => {
      let resp, err

      beforeEach(done => {
        err = {
          message: 'Uh oh'
        }

        resp = {
          json: jest.fn().mockReturnValue(Promise.resolve(err)),
          ok: false,
          status: 400
        }

        promise.catch(() => {
          done()
        })

        fetchResolver.resolve(resp)
      })

      it('should not resolve', () => {
        expect(resolution).toBe(null)
      })

      it('should reject with the proper error', () => {
        expect(rejection).toEqual(new Error(`400: ${JSON.stringify(err)}`))
      })
    })

    describe('when fetch errors', () => {
      beforeEach(done => {
        promise.catch(() => {
          done()
        })

        fetchResolver.reject('my-error')
      })

      it('should pass up the error', () => {
        expect(rejection).toBe('my-error')
      })
    })
  })

  describe('.postComment()', () => {
    let resolution, rejection, promise, fetchResolver

    beforeEach(() => {
      fetchResolver = {}
      let fetchPromise = new Promise((resolve, reject) => {
        fetchResolver.resolve = resolve
        fetchResolver.reject = reject
      })

      fetch.mockReturnValue(fetchPromise)

      resolution = rejection = null
      promise = bitbucket.postComment('5', 'Missing PR scope!')
        .then(resp => {
          resolution = resp
          return resolution
        })
        .catch(err => {
          rejection = err
          throw err
        })
    })

    it('should call fetch with proper params', () => {
      const url = `${bitbucket.baseUrl}/projects/me/repos/my-repo/pull-requests/5/comments`
      expect(fetch).toHaveBeenCalledWith(url, {
        method: 'POST',
        body: JSON.stringify({text: 'Missing PR scope!'}),
        headers: {'Content-Type': 'application/json'}
      })
    })

    describe('when fetch resolves with success', () => {
      beforeEach(done => {
        promise.then(() => {
          done()
        })
        fetchResolver.resolve({ok: true})
      })

      it('should resolve', () => {
        expect(resolution).toBe(undefined)
      })
    })

    describe('when fetch resolves with error', () => {
      let resp, err

      beforeEach(done => {
        err = {message: 'Uh oh'}
        resp = {
          ok: false,
          status: 400,
          json () {
            return Promise.resolve(err)
          }
        }
        promise.catch(() => {
          done()
        })
        fetchResolver.resolve(resp)
      })

      it('should not resolve', () => {
        expect(resolution).toBe(null)
      })

      it('should reject with proper error', () => {
        expect(rejection).toEqual(new Error(`400: ${JSON.stringify(err)}`))
      })
    })

    describe('when fetch rejects', () => {
      beforeEach(done => {
        promise.catch(() => {
          done()
        })
        fetchResolver.reject('Uh oh')
      })

      it('should not resolve', () => {
        expect(resolution).toBe(null)
      })

      it('should reject with proper error', () => {
        expect(rejection).toBe('Uh oh')
      })
    })
  })
})
