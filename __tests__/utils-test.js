jest.mock('fs')
jest.mock('../src/logger')

import {readFileSync} from 'fs'
import __ from 'lodash'

import * as utils from '../src/utils'

function mockJSONFileRead (data) {
  readFileSync.mockImplementationOnce(() => {
    if (data instanceof Error) {
      throw data
    }

    return JSON.stringify(data)
  })
}

/**
 * Save the existing environment variables into an env object
 * @param {String[]} args - the environment variables to save
 * @param {Object} env - the object in which to save the environment variables
 */
function saveEnv (args, env) {
  __.forEach(args, arg => {
    env[arg] = process.env[arg]
  })
}

/**
 * Set the environment variables based on the given env hash
 * @param {Object} env - the object from which to set environment variables
 */
function setEnv (env) {
  __.forIn(env, (value, key) => {
    process.env[key] = value
  })
}

/**
 * Verifiy that getConfig filled in the proper feature defaults
 * @param {Object} ctx - the context object for the tests
 * @param {String[]} propsToSkip - an array of string properties to skip the check for (if they've been overwritten)
 */
function verifyFeatureDefaults (ctx, propsToSkip) {
  if (propsToSkip === undefined) {
    propsToSkip = []
  }

  // NOTE: disabling complexity check here b/c it's just complaining about the conditionals around
  // all the it() blocks now, but they're necessary to test overrides
  /* eslint-disable complexity */
  describe('when using feature defaults', () => {
    let config

    beforeEach(() => {
      config = ctx.config
    })

    if (propsToSkip.indexOf('features.changelog.enabled') === -1) {
      it('should default changelog feature to disabled', () => {
        expect(config.features.changelog.enabled).toBe(false)
      })
    }

    if (propsToSkip.indexOf('features.changelog.file') === -1) {
      it('should default changelog file to "CHANGELOG.md"', () => {
        expect(config.features.changelog.file).toBe('CHANGELOG.md')
      })
    }

    if (propsToSkip.indexOf('features.comments.enabled') === -1) {
      it('should default pr comments feature to disabled', () => {
        expect(config.features.comments.enabled).toBe(false)
      })
    }

    if (propsToSkip.indexOf('features.compliance.enabled') === -1) {
      it('should default compliance feature to disabled', () => {
        expect(config.features.compliance.enabled).toBe(false)
      })
    }

    if (propsToSkip.indexOf('features.coverage.enabled') === -1) {
      it('should default coverage feature to disabled', () => {
        expect(config.features.coverage.enabled).toBe(false)
      })
    }

    if (propsToSkip.indexOf('features.coverage.file') === -1) {
      it('should default coverage file to "coverage/coverage-summary.json"', () => {
        expect(config.features.coverage.file).toBe('coverage/coverage-summary.json')
      })
    }

    if (propsToSkip.indexOf('features.dependencies.enabled') === -1) {
      it('should default dependency snapshot feature to disabled', () => {
        expect(config.features.dependencies.enabled).toBe(false)
      })
    }

    if (propsToSkip.indexOf('features.dependencies.snapshotFile') === -1) {
      it('should default dependency snapshot file to "dependency-snapshot.json"', () => {
        expect(config.features.dependencies.snapshotFile).toBe('dependency-snapshot.json')
      })
    }

    if (propsToSkip.indexOf('features.maxScope.enabled') === -1) {
      it('should default maxScope feature to disabled', () => {
        expect(config.features.maxScope.enabled).toBe(false)
      })
    }

    if (propsToSkip.indexOf('features.maxScope.value') === -1) {
      it('should default maxScope value to "major"', () => {
        expect(config.features.maxScope.value).toBe('major')
      })
    }
  })
  /* eslint-enable complexity */
}

/**
 * Verifiy that getConfig filled in the proper Github/Travis defaults
 * @param {Object} ctx - the context object for the tests
 * @param {String[]} propsToSkip - an array of string properties to skip the check for (if they've been overwritten)
 */
function verifyGitHubTravisDefaults (ctx, propsToSkip) {
  if (propsToSkip === undefined) {
    propsToSkip = []
  }

  // NOTE: disabling complexity check here b/c it's just complaining about the conditionals around
  // all the it() blocks now, but they're necessary to test overrides
  /* eslint-disable complexity */
  describe('when using github/travis defaults', () => {
    let config

    beforeEach(() => {
      config = ctx.config
    })

    if (propsToSkip.indexOf('ci.gitUser') === -1) {
      it('should use the proper git user', () => {
        expect(config.ci.gitUser).toEqual({
          email: 'travis.ci.ciena@gmail.com',
          name: 'Travis CI'
        })
      })
    }

    if (propsToSkip.indexOf('ci.provider') === -1) {
      it('should use the proper ci provider', () => {
        expect(config.ci.provider).toBe('travis')
      })
    }

    if (propsToSkip.indexOf('vcs.repository.owner') === -1) {
      it('should have the proper owner', () => {
        expect(config.vcs.repository.owner).toBe('jdoe')
      })
    }

    if (propsToSkip.indexOf('computed.ci.branch') === -1) {
      it('should have the proper branch', () => {
        expect(config.computed.ci.branch).toBe('my-branch')
      })
    }

    if (propsToSkip.indexOf('vcs.repository.name') === -1) {
      it('should have the proper repository name', () => {
        expect(config.vcs.repository.name).toBe('john-and-jane')
      })
    }

    if (propsToSkip.indexOf('vcs.domain') === -1) {
      it('should have the proper vcs domain', () => {
        expect(config.vcs.domain).toBe('github.com')
      })
    }

    if (propsToSkip.indexOf('vcs.provider') === -1) {
      it('should have the proper vcs provider', () => {
        expect(config.vcs.provider).toBe('github')
      })
    }

    if (propsToSkip.indexOf('computed.vcs.auth') === -1) {
      it('should have the proper vcs auth', () => {
        expect(config.computed.vcs.auth).toEqual({
          password: undefined,
          readToken: '12345',
          username: undefined,
          writeToken: '54321'
        })
      })
    }
  })
  /* eslint-enable complexity */
}

/**
 * Verifiy that getConfig filled in the proper Bitbucket/TeamCity config overrides
 * @param {Object} ctx - the context object for the tests
 */
function verifyBitbucketTeamcityOverrides (ctx) {
  describe('when using bitbucket/teamcity overrides', () => {
    let config

    beforeEach(() => {
      config = ctx.config
    })

    it('should have the proper git user', () => {
      expect(config.ci.gitUser).toEqual({
        email: 'teamcity@domain.com',
        name: 'teamcity'
      })
    })

    it('should have the proper ci provider', () => {
      expect(config.ci.provider).toBe('teamcity')
    })

    it('should have the proper repository owner', () => {
      expect(config.vcs.repository.owner).toBe('my-project')
    })

    it('should have the proper repository name', () => {
      expect(config.vcs.repository.name).toBe('my-repo')
    })

    it('should have the proper branch', () => {
      expect(config.computed.ci.branch).toBe('my-branch')
    })

    it('should have the proper vcs domain', () => {
      expect(config.vcs.domain).toBe('bitbucket.domain.com')
    })

    it('should have the proper vcs provider', () => {
      expect(config.vcs.provider).toBe('bitbucket-server')
    })

    it('should have the proper vcs auth', () => {
      expect(config.computed.vcs.auth).toEqual({
        password: 'teamcity12345',
        readToken: undefined,
        username: 'teamcity',
        writeToken: undefined
      })
    })
  })
}

describe('utils', () => {
  describe('.getConfig()', () => {
    let config, env, realEnv

    beforeEach(() => {
      realEnv = {}
    })

    afterEach(() => {
      setEnv(realEnv)
    })

    describe('GitHub/Travis (default case)', () => {
      let ctx = {}

      beforeEach(() => {
        env = {
          'TRAVIS_BRANCH': 'my-branch',
          'TRAVIS_BUILD_NUMBER': '123',
          'TRAVIS_REPO_SLUG': 'jdoe/john-and-jane',
          'RO_GH_TOKEN': '12345',
          'GITHUB_TOKEN': '54321'
        }
      })

      describe('when doing a pull request build (w/o coverage in package.json)', () => {
        beforeEach(() => {
          env.TRAVIS_PULL_REQUEST = '13'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          // '.pr-bumper.json'
          mockJSONFileRead(new Error())

          // 'package.json'
          mockJSONFileRead({})

          ctx.config = config = utils.getConfig()
        })

        verifyGitHubTravisDefaults(ctx)
        verifyFeatureDefaults(ctx)

        it('should set isPr to true', () => {
          expect(config.computed.ci.isPr).toBe(true)
        })

        it('should set prNumber to the PR number', () => {
          expect(config.computed.ci.prNumber).toBe('13')
        })

        it('should not have a baselineCoverage set', () => {
          expect(config.computed.baselineCoverage).toBe(0)
        })
      })

      describe('when doing a pull request build (with coverage in package.json)', () => {
        beforeEach(() => {
          env.TRAVIS_PULL_REQUEST = '13'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          // '.pr-bumper.json'
          mockJSONFileRead(new Error())

          // 'package.json'
          mockJSONFileRead({
            'pr-bumper': {
              coverage: 85.93
            }
          })

          ctx.config = config = utils.getConfig()
        })

        verifyGitHubTravisDefaults(ctx)
        verifyFeatureDefaults(ctx)

        it('should set isPr to true', () => {
          expect(config.computed.ci.isPr).toBe(true)
        })

        it('should set prNumber to the PR number', () => {
          expect(config.computed.ci.prNumber).toBe('13')
        })

        it('should set baselineCoverage to the coverage from package.json', () => {
          expect(config.computed.baselineCoverage).toBe(85.93)
        })
      })

      describe('when doing a merge build (w/o coverage in package.json)', () => {
        beforeEach(() => {
          env.TRAVIS_PULL_REQUEST = 'false'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          // '.pr-bumper.json'
          mockJSONFileRead(new Error())

          // 'package.json'
          mockJSONFileRead({})

          ctx.config = config = utils.getConfig()
        })

        verifyGitHubTravisDefaults(ctx)
        verifyFeatureDefaults(ctx)

        it('should set isPr to false', () => {
          expect(config.computed.ci.isPr).toBe(false)
        })

        it('should set prNumber to false', () => {
          expect(config.computed.ci.prNumber).toBe('false')
        })

        it('should not have a baselineCoverage set', () => {
          expect(config.computed.baselineCoverage).toBe(0)
        })
      })

      describe('when doing a merge build (with coverage in package.json)', () => {
        beforeEach(() => {
          env.TRAVIS_PULL_REQUEST = 'false'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          // '.pr-bumper.json'
          mockJSONFileRead(new Error())

          // 'package.json'
          mockJSONFileRead({
            'pr-bumper': {
              coverage: 85.93
            }
          })

          ctx.config = config = utils.getConfig()
        })

        verifyGitHubTravisDefaults(ctx)
        verifyFeatureDefaults(ctx)

        it('should set isPr to false', () => {
          expect(config.computed.ci.isPr).toBe(false)
        })

        it('should set prNumber to false', () => {
          expect(config.computed.ci.prNumber).toBe('false')
        })

        it('should set baselineCoverage to the coverage from package.json', () => {
          expect(config.computed.baselineCoverage).toBe(85.93)
        })
      })

      describe('when a partial config is given', () => {
        beforeEach(() => {
          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          // '.pr-bumper.json'
          mockJSONFileRead({
            ci: {
              gitUser: {
                email: 'some.other.user@domain.com',
                name: 'Some Other User'
              }
            },
            features: {
              changelog: {
                enabled: true,
                file: 'CHANGES.md'
              }
            }
          })

          // 'package.json'
          mockJSONFileRead({})

          ctx.config = config = utils.getConfig()
        })

        verifyGitHubTravisDefaults(ctx, ['ci.gitUser'])
        verifyFeatureDefaults(ctx, ['features.changelog.enabled', 'features.changelog.file'])

        it('should use the overwritten git user', () => {
          expect(config.ci.gitUser).toEqual({
            email: 'some.other.user@domain.com',
            name: 'Some Other User'
          })
        })

        it('should use the overwritten changelog settings', () => {
          expect(config.features.changelog).toEqual({
            enabled: true,
            file: 'CHANGES.md'
          })
        })
      })

      describe('when pr env is missing', () => {
        beforeEach(() => {
          env.TRAVIS_PULL_REQUEST = undefined
          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          // '.pr-bumper.json'
          mockJSONFileRead(new Error())

          // 'package.json'
          mockJSONFileRead({})

          ctx.config = config = utils.getConfig()
        })

        it('should not consider it a PR', () => {
          expect(config.computed.ci.isPr).toBe(false)
        })
      })
    })

    describe('GitHubEnterprise/Travis', () => {
      const ctx = {}
      let _config, _pkgJson

      beforeEach(() => {
        _config = {
          ci: {
            gitUser: {
              email: 'bot@domain.com',
              name: 'Bot User'
            }
          },
          features: {
            comments: {
              enabled: true
            }
          },
          vcs: {
            domain: 'ghe.domain.com',
            provider: 'github-enterprise'
          }
        }

        _pkgJson = {
          'pr-bumper': {
            coverage: 98.03
          }
        }

        env = {
          'TRAVIS_BRANCH': 'my-branch',
          'TRAVIS_BUILD_NUMBER': '123',
          'TRAVIS_REPO_SLUG': 'jdoe/john-and-jane',
          'RO_GH_TOKEN': '12345',
          'GITHUB_TOKEN': '54321'
        }
      })

      describe('when doing a pull request build (w/o coverage in package.json)', () => {
        beforeEach(() => {
          env.TRAVIS_PULL_REQUEST = '13'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          // '.pr-bumper.json'
          mockJSONFileRead(_config)

          // 'package.json'
          mockJSONFileRead({})

          ctx.config = config = utils.getConfig()
        })

        verifyGitHubTravisDefaults(ctx, ['ci.gitUser', 'vcs.domain', 'vcs.provider'])
        verifyFeatureDefaults(ctx, ['features.comments.enabled'])

        it('should have the proper gitUser', () => {
          expect(config.ci.gitUser).toEqual({
            email: 'bot@domain.com',
            name: 'Bot User'
          })
        })

        it('should have the proper vcs.domain', () => {
          expect(config.vcs.domain).toBe('ghe.domain.com')
        })

        it('should have the proper vcs.provider', () => {
          expect(config.vcs.provider).toBe('github-enterprise')
        })

        it('should set isPr to true', () => {
          expect(config.computed.ci.isPr).toBe(true)
        })

        it('should set prNumber to the PR number', () => {
          expect(config.computed.ci.prNumber).toBe('13')
        })

        it('should not have a baselineCoverage set', () => {
          expect(config.computed.baselineCoverage).toBe(0)
        })

        it('should enable the comments feature', () => {
          expect(config.features.comments.enabled).toBe(true)
        })
      })

      describe('when doing a pull request build (with coverage in package.json)', () => {
        beforeEach(() => {
          env.TRAVIS_PULL_REQUEST = '13'

          _config.features = {
            compliance: {
              enabled: true,
              production: true,
              output: {
                directory: 'foo-bar',
                requirementsFile: 'requirements.json',
                reposFile: 'repos-file',
                ignoreFile: 'ignore-file'
              },
              additionalRepos: ['none']
            }
          }

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          // '.pr-bumper.json'
          mockJSONFileRead(_config)

          // 'package.json'
          mockJSONFileRead(_pkgJson)

          ctx.config = config = utils.getConfig()
        })

        verifyGitHubTravisDefaults(ctx, ['ci.gitUser', 'vcs.domain', 'vcs.provider'])
        verifyFeatureDefaults(ctx, ['features.compliance.enabled'])

        it('should have the proper gitUser', () => {
          expect(config.ci.gitUser).toEqual({
            email: 'bot@domain.com',
            name: 'Bot User'
          })
        })

        it('should have the proper vcs.domain', () => {
          expect(config.vcs.domain).toBe('ghe.domain.com')
        })

        it('should have the proper vcs.provider', () => {
          expect(config.vcs.provider).toBe('github-enterprise')
        })

        it('should set isPr to true', () => {
          expect(config.computed.ci.isPr).toBe(true)
        })

        it('should set prNumber to the PR number', () => {
          expect(config.computed.ci.prNumber).toBe('13')
        })

        it('should set baselineCoverage to the coverage from package.json', () => {
          expect(config.computed.baselineCoverage).toBe(98.03)
        })

        it('should use the overwritten compliance config', () => {
          expect(config.features.compliance).toEqual(_config.features.compliance)
        })
      })

      describe('when doing a merge build (w/o coverage in package.json)', () => {
        beforeEach(() => {
          env.TRAVIS_PULL_REQUEST = 'false'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          _config.features = {
            dependencies: {
              enabled: true,
              snapshotFile: 'snapshot.json'
            }
          }

          // '.pr-bumper.json'
          mockJSONFileRead(_config)

          // 'package.json'
          mockJSONFileRead({})

          ctx.config = config = utils.getConfig()
        })

        verifyGitHubTravisDefaults(ctx, ['ci.gitUser', 'vcs.domain', 'vcs.provider'])
        verifyFeatureDefaults(ctx, ['features.dependencies.enabled', 'features.dependencies.snapshotFile'])

        it('should have the proper gitUser', () => {
          expect(config.ci.gitUser).toEqual({
            email: 'bot@domain.com',
            name: 'Bot User'
          })
        })

        it('should have the proper vcs.domain', () => {
          expect(config.vcs.domain).toBe('ghe.domain.com')
        })

        it('should have the proper vcs.provider', () => {
          expect(config.vcs.provider).toBe('github-enterprise')
        })

        it('should set isPr to false', () => {
          expect(config.computed.ci.isPr).toBe(false)
        })

        it('should set prNumber to false', () => {
          expect(config.computed.ci.prNumber).toBe('false')
        })

        it('should not have a baselineCoverage set', () => {
          expect(config.computed.baselineCoverage).toBe(0)
        })

        it('should have the proper dependencies feature config', () => {
          expect(config.features.dependencies).toEqual(_config.features.dependencies)
        })
      })

      describe('when doing a merge build (with coverage in package.json)', () => {
        beforeEach(() => {
          env.TRAVIS_PULL_REQUEST = 'false'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          _config.features = {
            maxScope: {
              enabled: true,
              value: 'patch'
            }
          }

          // '.pr-bumper.json'
          mockJSONFileRead(_config)

          // 'package.json'
          mockJSONFileRead(_pkgJson)

          ctx.config = config = utils.getConfig()
        })

        verifyGitHubTravisDefaults(ctx, ['ci.gitUser', 'vcs.domain', 'vcs.provider'])
        verifyFeatureDefaults(ctx, ['features.maxScope.enabled', 'features.maxScope.value'])

        it('should have the proper gitUser', () => {
          expect(config.ci.gitUser).toEqual({
            email: 'bot@domain.com',
            name: 'Bot User'
          })
        })

        it('should have the proper vcs.domain', () => {
          expect(config.vcs.domain).toBe('ghe.domain.com')
        })

        it('should have the proper vcs.provider', () => {
          expect(config.vcs.provider).toBe('github-enterprise')
        })

        it('should set isPr to false', () => {
          expect(config.computed.ci.isPr).toBe(false)
        })

        it('should set prNumber to false', () => {
          expect(config.computed.ci.prNumber).toBe('false')
        })

        it('should set baselineCoverage to the coverage from package.json', () => {
          expect(config.computed.baselineCoverage).toBe(98.03)
        })

        it('should have the proper maxScope config', () => {
          expect(config.features.maxScope).toEqual(_config.features.maxScope)
        })
      })
    })

    describe('Bitbucket/TeamCity', () => {
      let ctx = {}
      let _config

      beforeEach(() => {
        env = {
          'TRAVIS_BRANCH': 'undefined',
          'TRAVIS_BUILD_NUMBER': 'undefined',
          'TRAVIS_REPO_SLUG': 'undefined',
          'RO_GH_TOKEN': 'undefined',
          'GITHUB_TOKEN': 'undefined',
          'TEAMCITY_BRANCH': 'my-branch',
          'TEAMCITY_BUILD_NUMBER': '123',
          'VCS_USERNAME': 'teamcity',
          'VCS_PASSWORD': 'teamcity12345'
        }

        // fake what comes from .pr-bumper.json
        _config = {
          ci: {
            env: {
              branch: 'TEAMCITY_BRANCH',
              buildNumber: 'TEAMCITY_BUILD_NUMBER',
              pr: 'TEAMCITY_PULL_REQUEST'
            },
            gitUser: {
              email: 'teamcity@domain.com',
              name: 'teamcity'
            },
            provider: 'teamcity'
          },
          vcs: {
            domain: 'bitbucket.domain.com',
            env: {
              username: 'VCS_USERNAME',
              password: 'VCS_PASSWORD'
            },
            repository: {
              name: 'my-repo',
              owner: 'my-project'
            },
            provider: 'bitbucket-server'
          }
        }
      })

      describe('when doing a pull request build', () => {
        beforeEach(() => {
          env.TEAMCITY_PULL_REQUEST = '13'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          // '.pr-bumper.json'
          mockJSONFileRead(_config)

          // 'package.json'
          mockJSONFileRead({})

          ctx.config = config = utils.getConfig()
        })

        verifyBitbucketTeamcityOverrides(ctx)
        verifyFeatureDefaults(ctx)

        it('should set isPr to true', () => {
          expect(config.computed.ci.isPr).toBe(true)
        })

        it('should set prNumber to the PR number', () => {
          expect(config.computed.ci.prNumber).toBe('13')
        })
      })

      describe('when doing a merge build', () => {
        beforeEach(() => {
          env.TEAMCITY_PULL_REQUEST = 'false'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          // '.pr-bumper.json'
          mockJSONFileRead(_config)

          // 'package.json'
          mockJSONFileRead({})

          ctx.config = config = utils.getConfig()
        })

        verifyBitbucketTeamcityOverrides(ctx)
        verifyFeatureDefaults(ctx)

        it('should set isPr to false', () => {
          expect(config.computed.ci.isPr).toBe(false)
        })

        it('should set prNumber to false', () => {
          expect(config.computed.ci.prNumber).toBe('false')
        })
      })

      describe('when no branch env is given', () => {
        beforeEach(() => {
          delete _config.ci.env.branch

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          // '.pr-bumper.json'
          mockJSONFileRead(_config)

          // 'package.json'
          mockJSONFileRead({})

          config = utils.getConfig()
        })

        it('should default to master branch', () => {
          expect(config.computed.ci.branch).toBe('master')
        })
      })
    })
  })

  describe('.getValidatedScope()', () => {
    const prUrl = 'my-pr-url'
    const prNumber = '12345'
    const scopes = {
      fix: 'patch',
      patch: 'patch',
      feature: 'minor',
      minor: 'minor',
      breaking: 'major',
      major: 'major',
      none: 'none'
    }

    __.forIn(scopes, (value, key) => {
      it(`should handle a scope of "${key}"`, () => {
        const ret = utils.getValidatedScope({
          scope: key,
          prNumber,
          prUrl
        })
        expect(ret).toBe(value)
      })
    })

    it('should throw an error on invalid scope', () => {
      const fn = () => {
        utils.getValidatedScope({
          scope: 'foo-bar',
          prNumber,
          prUrl
        })
      }

      expect(fn).toThrow('Invalid version-bump scope "foo-bar" found for PR #12345 (my-pr-url)')
    })

    describe('when max scope is set', () => {
      const maxScopes = {
        none: {
          valid: ['none'],
          invalid: ['fix', 'patch', 'feature', 'minor', 'breaking', 'major']
        },
        patch: {
          valid: ['none', 'fix', 'patch'],
          invalid: ['feature', 'minor', 'breaking', 'major']
        },
        minor: {
          valid: ['none', 'fix', 'patch', 'feature', 'minor'],
          invalid: ['breaking', 'major']
        },
        major: {
          valid: ['none', 'fix', 'patch', 'feature', 'minor', 'breaking', 'major'],
          invalid: []
        }
      }

      Object.keys(maxScopes).forEach(maxScope => {
        const {invalid, valid} = maxScopes[maxScope]
        describe(`with a maxScope of "${maxScope}"`, () => {
          valid.forEach(scope => {
            it(`should be fine when scope is "${scope}"`, () => {
              const ret = utils.getValidatedScope({
                scope,
                maxScope,
                prNumber,
                prUrl
              })

              expect(ret).toBe(scopes[scope])
            })
          })

          invalid.forEach(scope => {
            it(`should throw an error when scope is "${scope}"`, () => {
              const fn = () => {
                utils.getValidatedScope({
                  scope,
                  maxScope,
                  prNumber,
                  prUrl
                })
              }
              const prStr = `PR #${prNumber} (${prUrl})`
              const msg = `Version-bump scope "${scope}" is higher than the maximum "${maxScope}" for ${prStr}`
              expect(fn).toThrow(msg)
            })
          })
        })
      })
    })
  })

  describe('.getScopeForPr()', () => {
    let pr

    beforeEach(() => {
      pr = {
        description: '',
        number: '12345',
        url: 'my-pr-url'
      }
    })

    it('should throw error when no version-bump present', () => {
      pr.description = 'My super-cool new feature'
      const example = 'Please include a scope (e.g. `#major#`, `#minor#`, `#patch#`) in your PR description.'
      const exampleLink = 'See https://github.com/ciena-blueplanet/pr-bumper#pull-requests for more details.'
      expect(() => {
        utils.getScopeForPr(pr)
      })
        .toThrow(`No version-bump scope found for [PR #12345](my-pr-url)\n${example}\n${exampleLink}`)
    })

    it('should throw error when multiple version-bumps are present', () => {
      pr.description = 'This is my cool #feature# or is it a #fix#?'
      expect(() => {
        utils.getScopeForPr(pr)
      })
        .toThrow('Too many version-bump scopes found for [PR #12345](my-pr-url)')
    })

    it('should return scope when a single version-bump is present', () => {
      pr.description = 'This is my super-cool #feature#'
      expect(utils.getScopeForPr(pr)).toBe('minor')
    })

    describe('when given a maxScope', () => {
      beforeEach(() => {
        pr.description = 'This is my super-cool #feature#'
      })

      it('should return the scope when less than max scope', () => {
        expect(utils.getScopeForPr(pr, 'major')).toBe('minor')
      })

      it('should return the scope when same as max scope', () => {
        expect(utils.getScopeForPr(pr, 'minor')).toBe('minor')
      })

      it('should throw error when greater than max scope', () => {
        expect(() => {
          utils.getScopeForPr(pr, 'patch')
        })
          .toThrow('Version-bump scope "feature" is higher than the maximum "patch" for PR #12345 (my-pr-url)')
      })
    })

    it('should return scope when GFM checkbox syntax is present with one scope checked', () => {
      pr.description = `
### Check the scope of this pr:
- [ ] #none# - documentation fixes and/or test additions
- [ ] #patch# - bugfix, dependency update
- [x] #minor# - new feature, backwards compatible
- [ ] #major# - major feature, probably breaking API
- [ ] #breaking# - any change that breaks the API`
      expect(utils.getScopeForPr(pr)).toBe('minor')
    })

    it('should throw error when GFM checkbox syntax is present with multiple scopes checked', () => {
      pr.description = `
### Check the scope of this pr:
- [x] #patch# - bugfix, dependency update
- [ ] #minor# - new feature, backwards compatible
- [x] #major# - major feature, probably breaking API
- [ ] #breaking# - any change that breaks the API`
      expect(() => {
        utils.getScopeForPr(pr)
      })
        .toThrow('Too many version-bump scopes found for [PR #12345](my-pr-url)')
    })

    it(
      'should return scope when GFM checkbox syntax is present with one scope checked and other scopes mentioned',
      () => {
        pr.description = `
  ### Check the scope of this pr:
  - [ ] #patch# - bugfix, dependency update
  - [x] #minor# - new feature, backwards compatible
  - [ ] #major# - major feature, probably breaking API
  - [ ] #breaking# - any change that breaks the API

  Thought this might be #breaking# but on second thought it is a minor change
  `
        expect(utils.getScopeForPr(pr)).toBe('minor')
      })
  })

  describe('.getChangelogForPr()', () => {
    const link = 'https://github.com/ciena-blueplanet/pr-bumper#changelog'
    const errorMsg = 'No CHANGELOG content found in PR description.\n' +
      'Please add a `# CHANGELOG` section to your PR description with some content describing your change.\n' +
      `See ${link} for details.`

    let pr, changelog

    beforeEach(() => {
      pr = {
        description: '',
        number: '12345',
        url: 'my-pr-url'
      }
    })

    describe('when no changelog present', () => {
      beforeEach(() => {
        pr.description = 'My super-cool new feature'
      })

      it('should throw an error', () => {
        expect(() => {
          utils.getChangelogForPr(pr)
        }).toThrow(Error, errorMsg)
      })
    })

    describe('when changelog empty', () => {
      beforeEach(() => {
        pr.description = 'My super-cool new feature\n #CHANGELOG'
      })

      it('should throw an error', () => {
        expect(() => {
          utils.getChangelogForPr(pr)
        }).toThrow(Error, errorMsg)
      })
    })

    describe('when multiple changelog sections are present', () => {
      beforeEach(() => {
        pr.description = '#CHANGELOG\n## Fixes\nFoo, Bar, Baz\n#changelog\n## Features\nFizz, Bang'
      })

      it('should throw an error', () => {
        expect(() => {
          utils.getChangelogForPr(pr)
        }).toThrow(Error, 'Multiple changelog sections found. Line 1 and line 4.')
      })
    })

    describe('when changelog section is present', () => {
      beforeEach(() => {
        pr.description = '#changelog\r\n## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang'
        changelog = utils.getChangelogForPr(pr)
      })

      it('should grab the changelog text', () => {
        expect(changelog).toEqual('## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang')
      })
    })

    describe('when changelog section has extra space at the end', () => {
      beforeEach(() => {
        pr.description = '# CHANGELOG    \n## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang'
        changelog = utils.getChangelogForPr(pr)
      })

      it('should grab the changelog text', () => {
        expect(changelog).toEqual('## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang')
      })
    })
  })

  describe('.getCurrentCoverage()', () => {
    let config, coverageSummary, pct

    beforeEach(() => {
      config = {
        features: {
          coverage: {
            file: 'path-to-coverage/coverage-file.json'
          }
        }
      }

      coverageSummary = {
        total: {
          branches: {
            total: 10,
            covered: 9
          },
          statements: {
            total: 90,
            covered: 80
          }
        }
      }
    })

    describe('when no coverage present', () => {
      beforeEach(() => {
        mockJSONFileRead({})
        pct = utils.getCurrentCoverage(config)
      })

      it('should return -1', () => {
        expect(pct).toBe(-1)
      })
    })

    describe('when coverage is present', () => {
      beforeEach(() => {
        mockJSONFileRead(coverageSummary)
        pct = utils.getCurrentCoverage(config)
      })

      it('should return the total statement and branch pct', () => {
        expect(pct).toBe(89.00)
      })
    })
  })

  describe('.maybePostComment()', () => {
    let config, resolver, vcs, result, error

    beforeEach(() => {
      config = {
        computed: {
          ci: {
            isPr: true,
            prNumber: '123'
          }
        },
        isEnabled: jest.fn()
      }

      resolver = {}
      resolver.promise = new Promise((resolve, reject) => {
        resolver.resolve = resolve
        resolver.reject = reject
      })

      vcs = {
        postComment: jest.fn().mockReturnValue(resolver.promise)
      }

      result = error = null
    })

    describe('when feature is not enabled', () => {
      beforeEach(done => {
        config.isEnabled.mockReturnValue(false)
        utils.maybePostComment(config, vcs, 'fizz-bang')
          .then(resp => {
            result = resp
          })
          .catch(err => {
            error = err
          })

        setTimeout(() => {
          done()
        }, 0)
      })

      it('should not post a comment', () => {
        expect(vcs.postComment).toHaveBeenCalledTimes(0)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })

      it('should resolve', () => {
        expect(result).toBe(undefined)
      })
    })

    describe('when feature is enabled, but isPr is false', () => {
      beforeEach(done => {
        config.computed.ci.isPr = false
        config.isEnabled.mockImplementation(name => name === 'comments')

        utils.maybePostComment(config, vcs, 'fizz-bang')
          .then(resp => {
            result = resp
          })
          .catch(err => {
            error = err
          })

        setTimeout(() => {
          done()
        }, 0)
      })

      it('should not post a comment', () => {
        expect(vcs.postComment).toHaveBeenCalledTimes(0)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })

      it('should resolve', () => {
        expect(result).toBe(undefined)
      })
    })

    describe('when feature is enabled, and isPr is true, but SKIP_COMMENTS is in env', () => {
      let realSkipComments

      beforeEach(done => {
        realSkipComments = process.env['SKIP_COMMENTS']
        process.env['SKIP_COMMENTS'] = '1'
        config.computed.ci.isPr = true
        config.isEnabled.mockImplementation(name => name === 'comments')
        utils.maybePostComment(config, vcs, 'fizz-bang')
          .then(resp => {
            result = resp
          })
          .catch(err => {
            error = err
          })

        setTimeout(() => {
          done()
        }, 0)
      })

      afterEach(() => {
        if (realSkipComments !== undefined) {
          process.env['SKIP_COMMENTS'] = realSkipComments
        } else {
          delete process.env['SKIP_COMMENTS']
        }
      })

      it('should not post a comment', () => {
        expect(vcs.postComment).toHaveBeenCalledTimes(0)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })

      it('should resolve', () => {
        expect(result).toBe(undefined)
      })
    })

    describe('when feature is enabled and isPr is true (and no SKIP_COMMENTS is present)', () => {
      let promise

      beforeEach(() => {
        config.isEnabled.mockImplementation(name => name === 'comments')
        promise = utils.maybePostComment(config, vcs, 'fizz-bang')
          .then(resp => {
            result = resp
          })
          .catch(err => {
            error = err
            throw err
          })
      })

      it('should post a comment', () => {
        expect(vcs.postComment).toHaveBeenCalledWith(config.computed.ci.prNumber, 'fizz-bang')
      })

      it('should not reject yet', () => {
        expect(error).toBe(null)
      })

      it('should not resolve yet', () => {
        expect(result).toBe(null)
      })

      describe('when postComment succeeds', () => {
        beforeEach(() => {
          resolver.resolve()
          return promise
        })

        it('should not reject', () => {
          expect(error).toBe(null)
        })

        it('should resolve', () => {
          expect(result).toBe(undefined)
        })
      })

      describe('when postComment fails', () => {
        beforeEach(done => {
          resolver.reject(new Error('Aw snap!'))
          promise.catch(() => {
            done()
          })
        })

        it('should reject with a combined error', () => {
          const msg = 'Received error: Aw snap! while trying to post PR comment: fizz-bang'
          expect(error.message).toBe(msg)
        })

        it('should not resolve', () => {
          expect(result).toBe(null)
        })
      })
    })

    describe('when feature is enabled and isPr is true, and isError is true', () => {
      let promise

      beforeEach(() => {
        config.isEnabled.mockImplementation(name => name === 'comments')
        promise = utils.maybePostComment(config, vcs, 'fizz-bang', true)
          .then(resp => {
            result = resp
          })
          .catch(err => {
            error = err
            throw err
          })
      })

      it('should post a comment', () => {
        expect(vcs.postComment).toHaveBeenCalledWith(config.computed.ci.prNumber, '## ERROR\nfizz-bang')
      })

      it('should not reject yet', () => {
        expect(error).toBe(null)
      })

      it('should not resolve yet', () => {
        expect(result).toBe(null)
      })

      describe('when postComment succeeds', () => {
        beforeEach(() => {
          resolver.resolve()
          return promise
        })

        it('should not reject', () => {
          expect(error).toBe(null)
        })

        it('should resolve', () => {
          expect(result).toBe(undefined)
        })
      })

      describe('when postComment fails', () => {
        beforeEach(done => {
          resolver.reject(new Error('Aw snap!'))
          promise.catch(() => {
            done()
          })
        })

        it('should reject with a combined error', () => {
          const msg = 'Received error: Aw snap! while trying to post PR comment: ## ERROR\nfizz-bang'
          expect(error.message).toBe(msg)
        })

        it('should not resolve', () => {
          expect(result).toBe(null)
        })
      })
    })
  })

  describe('.maybePostCommentOnError()', () => {
    let config, resolver, vcs, func, result, error

    beforeEach(() => {
      config = {
        computed: {
          ci: {
            isPr: true,
            prNumber: '123'
          }
        },
        isEnabled: jest.fn()
      }

      resolver = {}
      resolver.promise = new Promise((resolve, reject) => {
        resolver.resolve = resolve
        resolver.reject = reject
      })

      vcs = {
        postComment: jest.fn().mockReturnValue(resolver.promise)
      }

      func = jest.fn()
      result = error = null
    })

    describe('when func succeeds', () => {
      beforeEach(() => {
        func.mockReturnValue('foo')
        return utils.maybePostCommentOnError(config, vcs, func)
          .then(resp => {
            result = resp
          })
          .catch(err => {
            error = err
            throw err
          })
      })

      it('should call the func', () => {
        expect(func).toHaveBeenCalledTimes(1)
      })

      it('should not post a comment', () => {
        expect(vcs.postComment).toHaveBeenCalledTimes(0)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })

      it('should resolve with the return value of func', () => {
        expect(result).toBe('foo')
      })
    })

    describe('when func throws an error', () => {
      beforeEach(() => {
        func.mockImplementation(() => {
          throw new Error('Uh oh!')
        })
      })

      describe('and feature is not enabled', () => {
        beforeEach(done => {
          config.isEnabled.mockReturnValue(false)
          utils.maybePostCommentOnError(config, vcs, func)
            .then(resp => {
              result = resp
            })
            .catch(err => {
              error = err
              done()
            })
        })

        it('should call the func', () => {
          expect(func).toHaveBeenCalledTimes(1)
        })

        it('should not post a comment', () => {
          expect(vcs.postComment).toHaveBeenCalledTimes(0)
        })

        it('should reject with the error thrown', () => {
          expect(error).toEqual(new Error('Uh oh!'))
        })

        it('should not resolve', () => {
          expect(result).toBe(null)
        })
      })

      describe('and feature is enabled but isPr is false', () => {
        beforeEach(done => {
          config.computed.ci.isPr = false
          config.isEnabled.mockImplementation(name => name === 'comments')
          utils.maybePostCommentOnError(config, vcs, func)
            .then(resp => {
              result = resp
            })
            .catch(err => {
              error = err
              done()
            })
        })

        it('should call the func', () => {
          expect(func).toHaveBeenCalledTimes(1)
        })

        it('should not post a comment', () => {
          expect(vcs.postComment).toHaveBeenCalledTimes(0)
        })

        it('should reject with the error thrown', () => {
          expect(error).toEqual(new Error('Uh oh!'))
        })

        it('should not resolve', () => {
          expect(result).toBe(null)
        })
      })

      describe('and prComments is true and isPr is true', () => {
        let promise

        beforeEach(() => {
          config.computed.ci.isPr = true
          config.isEnabled.mockImplementation(name => name === 'comments')
          promise = utils.maybePostCommentOnError(config, vcs, func)
            .then(resp => {
              result = resp
            })
            .catch(err => {
              error = err
              throw err
            })
        })

        it('should call the func', () => {
          expect(func).toHaveBeenCalledTimes(1)
        })

        it('should post a comment', () => {
          expect(vcs.postComment).toHaveBeenCalledWith(config.computed.ci.prNumber, '## ERROR\nUh oh!')
        })

        it('should not reject yet', () => {
          expect(error).toBe(null)
        })

        it('should not resolve', () => {
          expect(result).toBe(null)
        })

        describe('when postComment succeeds', () => {
          beforeEach(done => {
            resolver.resolve()
            promise.catch(() => {
              done()
            })
          })

          it('should reject with the original error', () => {
            expect(error.message).toBe('Uh oh!')
          })

          it('should not resolve', () => {
            expect(result).toBe(null)
          })
        })

        describe('when postComment fails', () => {
          beforeEach(done => {
            resolver.reject(new Error('Aw snap!'))
            promise.catch(() => {
              done()
            })
          })

          it('should reject with a combined error', () => {
            const msg = 'Received error: Aw snap! while trying to post PR comment about error: Uh oh!'
            expect(error.message).toBe(msg)
          })

          it('should not resolve', () => {
            expect(result).toBe(null)
          })
        })
      })
    })
  })
})
