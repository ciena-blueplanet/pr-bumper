'use strict'

const __ = require('lodash')
const chai = require('chai')
const sinonChai = require('sinon-chai')
const sinon = require('sinon')

const logger = require('../lib/logger')
const utils = require('../lib/utils')

chai.use(sinonChai)
const expect = chai.expect

/**
 * Save the existing environment variables into an env object
 * @param {String[]} args - the environment variables to save
 * @param {Object} env - the object in which to save the environment variables
 */
function saveEnv (args, env) {
  __.forEach(args, (arg) => {
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
  describe('when using feature defaults', function () {
    let config
    beforeEach(function () {
      config = ctx.config
    })

    if (propsToSkip.indexOf('features.changelog.enabled') === -1) {
      it('should default changelog feature to disabled', function () {
        expect(config.features.changelog.enabled).to.equal(false)
      })
    }

    if (propsToSkip.indexOf('features.changelog.file') === -1) {
      it('should default changelog file to "CHANGELOG.md"', function () {
        expect(config.features.changelog.file).to.equal('CHANGELOG.md')
      })
    }

    if (propsToSkip.indexOf('features.comments.enabled') === -1) {
      it('should default pr comments feature to disabled', function () {
        expect(config.features.comments.enabled).to.equal(false)
      })
    }

    if (propsToSkip.indexOf('features.compliance.enabled') === -1) {
      it('should default compliance feature to disabled', function () {
        expect(config.features.compliance.enabled).to.equal(false)
      })
    }

    if (propsToSkip.indexOf('features.coverage.enabled') === -1) {
      it('should default coverage feature to disabled', function () {
        expect(config.features.coverage.enabled).to.equal(false)
      })
    }

    if (propsToSkip.indexOf('features.coverage.file') === -1) {
      it('should default coverage file to "coverage/coverage-summary.json"', function () {
        expect(config.features.coverage.file).to.equal('coverage/coverage-summary.json')
      })
    }

    if (propsToSkip.indexOf('features.dependencies.enabled') === -1) {
      it('should default dependency snapshot feature to disabled', function () {
        expect(config.features.dependencies.enabled).to.equal(false)
      })
    }

    if (propsToSkip.indexOf('features.dependencies.snapshotFile') === -1) {
      it('should default dependency snapshot file to "dependency-snapshot.json"', function () {
        expect(config.features.dependencies.snapshotFile).to.equal('dependency-snapshot.json')
      })
    }

    if (propsToSkip.indexOf('features.maxScope.enabled') === -1) {
      it('should default maxScope feature to disabled', function () {
        expect(config.features.maxScope.enabled).to.equal(false)
      })
    }

    if (propsToSkip.indexOf('features.maxScope.value') === -1) {
      it('should default maxScope value to "major"', function () {
        expect(config.features.maxScope.value).to.equal('major')
      })
    }

    if (propsToSkip.indexOf('features.logging.enabled') === -1) {
      it('should default logging feature to disabled', function () {
        expect(config.features.logging.enabled).to.equal(false)
      })
    }

    if (propsToSkip.indexOf('features.logging.file') === -1) {
      it('should default logging file to "pr-bumper-log.json"', function () {
        expect(config.features.logging.file).to.equal('pr-bumper-log.json')
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
  describe('when using github/travis defaults', function () {
    let config
    beforeEach(function () {
      config = ctx.config
    })

    if (propsToSkip.indexOf('ci.gitUser') === -1) {
      it('should use the proper git user', function () {
        expect(config.ci.gitUser).to.deep.equal({
          email: 'travis.ci.ciena@gmail.com',
          name: 'Travis CI'
        })
      })
    }

    if (propsToSkip.indexOf('ci.provider') === -1) {
      it('should use the proper ci provider', function () {
        expect(config.ci.provider).to.equal('travis')
      })
    }

    if (propsToSkip.indexOf('vcs.repository.owner') === -1) {
      it('should have the proper owner', function () {
        expect(config.vcs.repository.owner).to.equal('jdoe')
      })
    }

    if (propsToSkip.indexOf('computed.ci.branch') === -1) {
      it('should have the proper branch', function () {
        expect(config.computed.ci.branch).to.equal('my-branch')
      })
    }

    if (propsToSkip.indexOf('vcs.repository.name') === -1) {
      it('should have the proper repository name', function () {
        expect(config.vcs.repository.name).to.equal('john-and-jane')
      })
    }

    if (propsToSkip.indexOf('vcs.domain') === -1) {
      it('should have the proper vcs domain', function () {
        expect(config.vcs.domain).to.equal('github.com')
      })
    }

    if (propsToSkip.indexOf('vcs.provider') === -1) {
      it('should have the proper vcs provider', function () {
        expect(config.vcs.provider).to.equal('github')
      })
    }

    if (propsToSkip.indexOf('computed.vcs.auth') === -1) {
      it('should have the proper vcs auth', function () {
        expect(config.computed.vcs.auth).to.deep.equal({
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
  describe('when using bitbucket/teamcity overrides', function () {
    let config
    beforeEach(function () {
      config = ctx.config
    })

    it('should have the proper git user', function () {
      expect(config.ci.gitUser).to.deep.equal({
        email: 'teamcity@domain.com',
        name: 'teamcity'
      })
    })

    it('should have the proper ci provider', function () {
      expect(config.ci.provider).to.equal('teamcity')
    })

    it('should have the proper repository owner', function () {
      expect(config.vcs.repository.owner).to.equal('my-project')
    })

    it('should have the proper repository name', function () {
      expect(config.vcs.repository.name).to.equal('my-repo')
    })

    it('should have the proper branch', function () {
      expect(config.computed.ci.branch).to.equal('my-branch')
    })

    it('should have the proper vcs domain', function () {
      expect(config.vcs.domain).to.equal('bitbucket.domain.com')
    })

    it('should have the proper vcs provider', function () {
      expect(config.vcs.provider).to.equal('bitbucket-server')
    })

    it('should have the proper vcs auth', function () {
      expect(config.computed.vcs.auth).to.deep.equal({
        password: 'teamcity12345',
        readToken: undefined,
        username: 'teamcity',
        writeToken: undefined
      })
    })
  })
}

describe('utils', function () {
  let sandbox

  beforeEach(function () {
    sandbox = sinon.sandbox.create()
    sandbox.stub(logger, 'log')
    sandbox.stub(utils, 'readJsonFile')
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('.getConfig()', function () {
    let config, env, realEnv

    beforeEach(function () {
      realEnv = {}
    })

    afterEach(function () {
      setEnv(realEnv)
    })

    describe('GitHub/Travis (default case)', function () {
      let ctx = {}
      beforeEach(function () {
        env = {
          'TRAVIS_BRANCH': 'my-branch',
          'TRAVIS_BUILD_NUMBER': '123',
          'TRAVIS_REPO_SLUG': 'jdoe/john-and-jane',
          'RO_GH_TOKEN': '12345',
          'GITHUB_TOKEN': '54321'
        }
      })

      describe('when doing a pull request build (w/o coverage in package.json)', function () {
        beforeEach(function () {
          env.TRAVIS_PULL_REQUEST = '13'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          utils.readJsonFile.withArgs('.pr-bumper.json').throws()
          utils.readJsonFile.withArgs('package.json').returns({})
          ctx.config = config = utils.getConfig()
        })

        verifyGitHubTravisDefaults(ctx)
        verifyFeatureDefaults(ctx)

        it('should set isPr to true', function () {
          expect(config.computed.ci.isPr).to.equal(true)
        })

        it('should set prNumber to the PR number', function () {
          expect(config.computed.ci.prNumber).to.equal('13')
        })

        it('should not have a baselineCoverage set', function () {
          expect(config.computed.baselineCoverage).to.equal(0)
        })
      })

      describe('when doing a pull request build (with coverage in package.json)', function () {
        beforeEach(function () {
          env.TRAVIS_PULL_REQUEST = '13'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          utils.readJsonFile.withArgs('.pr-bumper.json').throws()
          utils.readJsonFile.withArgs('package.json').returns({
            'pr-bumper': {
              coverage: 85.93
            }
          })

          ctx.config = config = utils.getConfig()
        })

        verifyGitHubTravisDefaults(ctx)
        verifyFeatureDefaults(ctx)

        it('should set isPr to true', function () {
          expect(config.computed.ci.isPr).to.equal(true)
        })

        it('should set prNumber to the PR number', function () {
          expect(config.computed.ci.prNumber).to.equal('13')
        })

        it('should set baselineCoverage to the coverage from package.json', function () {
          expect(config.computed.baselineCoverage).to.equal(85.93)
        })
      })

      describe('when doing a merge build (w/o coverage in package.json)', function () {
        beforeEach(function () {
          env.TRAVIS_PULL_REQUEST = 'false'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          utils.readJsonFile.withArgs('.pr-bumper.json').throws()
          utils.readJsonFile.withArgs('package.json').returns({})

          ctx.config = config = utils.getConfig()
        })

        verifyGitHubTravisDefaults(ctx)
        verifyFeatureDefaults(ctx)

        it('should set isPr to false', function () {
          expect(config.computed.ci.isPr).to.equal(false)
        })

        it('should set prNumber to false', function () {
          expect(config.computed.ci.prNumber).to.equal('false')
        })

        it('should not have a baselineCoverage set', function () {
          expect(config.computed.baselineCoverage).to.equal(0)
        })
      })

      describe('when doing a merge build (with coverage in package.json)', function () {
        beforeEach(function () {
          env.TRAVIS_PULL_REQUEST = 'false'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          utils.readJsonFile.withArgs('.pr-bumper.json').throws()
          utils.readJsonFile.withArgs('package.json').returns({
            'pr-bumper': {
              coverage: 85.93
            }
          })

          ctx.config = config = utils.getConfig()
        })

        verifyGitHubTravisDefaults(ctx)
        verifyFeatureDefaults(ctx)

        it('should set isPr to false', function () {
          expect(config.computed.ci.isPr).to.equal(false)
        })

        it('should set prNumber to false', function () {
          expect(config.computed.ci.prNumber).to.equal('false')
        })

        it('should set baselineCoverage to the coverage from package.json', function () {
          expect(config.computed.baselineCoverage).to.equal(85.93)
        })
      })

      describe('when a partial config is given', function () {
        beforeEach(function () {
          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          utils.readJsonFile.withArgs('.pr-bumper.json').returns({
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
              },
              logging: {
                enabled: true,
                file: '.pr-bumper.log'
              }
            }
          })
          utils.readJsonFile.withArgs('package.json').returns({})

          ctx.config = config = utils.getConfig()
        })

        verifyGitHubTravisDefaults(ctx, ['ci.gitUser'])
        verifyFeatureDefaults(ctx, [
          'features.changelog.enabled',
          'features.changelog.file',
          'features.logging.enabled',
          'features.logging.file'
        ])

        it('should use the overwritten git user', function () {
          expect(config.ci.gitUser).to.deep.equal({
            email: 'some.other.user@domain.com',
            name: 'Some Other User'
          })
        })

        it('should use the overwritten changelog settings', function () {
          expect(config.features.changelog).to.deep.equal({
            enabled: true,
            file: 'CHANGES.md'
          })
        })

        it('should use the overwritten logging settings', function () {
          expect(config.features.logging).to.deep.equal({
            enabled: true,
            file: '.pr-bumper.log'
          })
        })
      })

      describe('when pr env is missing', function () {
        beforeEach(function () {
          env.TRAVIS_PULL_REQUEST = undefined
          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          utils.readJsonFile.withArgs('.pr-bumper.json').throws()
          utils.readJsonFile.withArgs('package.json').returns({})

          ctx.config = config = utils.getConfig()
        })

        it('should not consider it a PR', function () {
          expect(config.computed.ci.isPr).to.equal(false)
        })
      })
    })

    describe('GitHubEnterprise/Travis', function () {
      const ctx = {}
      let _config, _pkgJson
      beforeEach(function () {
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

      describe('when doing a pull request build (w/o coverage in package.json)', function () {
        beforeEach(function () {
          env.TRAVIS_PULL_REQUEST = '13'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          utils.readJsonFile.withArgs('.pr-bumper.json').returns(_config)
          utils.readJsonFile.withArgs('package.json').returns({})

          ctx.config = config = utils.getConfig()
        })

        verifyGitHubTravisDefaults(ctx, ['ci.gitUser', 'vcs.domain', 'vcs.provider'])
        verifyFeatureDefaults(ctx, ['features.comments.enabled'])

        it('should have the proper gitUser', function () {
          expect(config.ci.gitUser).to.deep.equal({
            email: 'bot@domain.com',
            name: 'Bot User'
          })
        })

        it('should have the proper vcs.domain', function () {
          expect(config.vcs.domain).to.equal('ghe.domain.com')
        })

        it('should have the proper vcs.provider', function () {
          expect(config.vcs.provider).to.equal('github-enterprise')
        })

        it('should set isPr to true', function () {
          expect(config.computed.ci.isPr).to.equal(true)
        })

        it('should set prNumber to the PR number', function () {
          expect(config.computed.ci.prNumber).to.equal('13')
        })

        it('should not have a baselineCoverage set', function () {
          expect(config.computed.baselineCoverage).to.equal(0)
        })

        it('should enable the comments feature', function () {
          expect(config.features.comments.enabled).to.equal(true)
        })
      })

      describe('when doing a pull request build (with coverage in package.json)', function () {
        beforeEach(function () {
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

          utils.readJsonFile.withArgs('.pr-bumper.json').returns(_config)
          utils.readJsonFile.withArgs('package.json').returns(_pkgJson)

          ctx.config = config = utils.getConfig()
        })

        verifyGitHubTravisDefaults(ctx, ['ci.gitUser', 'vcs.domain', 'vcs.provider'])
        verifyFeatureDefaults(ctx, ['features.compliance.enabled'])

        it('should have the proper gitUser', function () {
          expect(config.ci.gitUser).to.deep.equal({
            email: 'bot@domain.com',
            name: 'Bot User'
          })
        })

        it('should have the proper vcs.domain', function () {
          expect(config.vcs.domain).to.equal('ghe.domain.com')
        })

        it('should have the proper vcs.provider', function () {
          expect(config.vcs.provider).to.equal('github-enterprise')
        })

        it('should set isPr to true', function () {
          expect(config.computed.ci.isPr).to.equal(true)
        })

        it('should set prNumber to the PR number', function () {
          expect(config.computed.ci.prNumber).to.equal('13')
        })

        it('should set baselineCoverage to the coverage from package.json', function () {
          expect(config.computed.baselineCoverage).to.equal(98.03)
        })

        it('should use the overwritten compliance config', function () {
          expect(config.features.compliance).to.deep.equal(_config.features.compliance)
        })
      })

      describe('when doing a merge build (w/o coverage in package.json)', function () {
        beforeEach(function () {
          env.TRAVIS_PULL_REQUEST = 'false'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          _config.features = {
            dependencies: {
              enabled: true,
              snapshotFile: 'snapshot.json'
            }
          }

          utils.readJsonFile.withArgs('.pr-bumper.json').returns(_config)
          utils.readJsonFile.withArgs('package.json').returns({})

          ctx.config = config = utils.getConfig()
        })

        verifyGitHubTravisDefaults(ctx, ['ci.gitUser', 'vcs.domain', 'vcs.provider'])
        verifyFeatureDefaults(ctx, ['features.dependencies.enabled', 'features.dependencies.snapshotFile'])

        it('should have the proper gitUser', function () {
          expect(config.ci.gitUser).to.deep.equal({
            email: 'bot@domain.com',
            name: 'Bot User'
          })
        })

        it('should have the proper vcs.domain', function () {
          expect(config.vcs.domain).to.equal('ghe.domain.com')
        })

        it('should have the proper vcs.provider', function () {
          expect(config.vcs.provider).to.equal('github-enterprise')
        })

        it('should set isPr to false', function () {
          expect(config.computed.ci.isPr).to.equal(false)
        })

        it('should set prNumber to false', function () {
          expect(config.computed.ci.prNumber).to.equal('false')
        })

        it('should not have a baselineCoverage set', function () {
          expect(config.computed.baselineCoverage).to.equal(0)
        })

        it('should have the proper dependencies feature config', function () {
          expect(config.features.dependencies).to.deep.equal(_config.features.dependencies)
        })
      })

      describe('when doing a merge build (with coverage in package.json)', function () {
        beforeEach(function () {
          env.TRAVIS_PULL_REQUEST = 'false'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          _config.features = {
            maxScope: {
              enabled: true,
              value: 'patch'
            }
          }

          utils.readJsonFile.withArgs('.pr-bumper.json').returns(_config)
          utils.readJsonFile.withArgs('package.json').returns(_pkgJson)

          ctx.config = config = utils.getConfig()
        })

        verifyGitHubTravisDefaults(ctx, ['ci.gitUser', 'vcs.domain', 'vcs.provider'])
        verifyFeatureDefaults(ctx, ['features.maxScope.enabled', 'features.maxScope.value'])

        it('should have the proper gitUser', function () {
          expect(config.ci.gitUser).to.deep.equal({
            email: 'bot@domain.com',
            name: 'Bot User'
          })
        })

        it('should have the proper vcs.domain', function () {
          expect(config.vcs.domain).to.equal('ghe.domain.com')
        })

        it('should have the proper vcs.provider', function () {
          expect(config.vcs.provider).to.equal('github-enterprise')
        })

        it('should set isPr to false', function () {
          expect(config.computed.ci.isPr).to.equal(false)
        })

        it('should set prNumber to false', function () {
          expect(config.computed.ci.prNumber).to.equal('false')
        })

        it('should set baselineCoverage to the coverage from package.json', function () {
          expect(config.computed.baselineCoverage).to.equal(98.03)
        })

        it('should have the proper maxScope config', function () {
          expect(config.features.maxScope).to.deep.equal(_config.features.maxScope)
        })
      })
    })

    describe('Bitbucket/TeamCity', function () {
      let ctx = {}
      let _config

      beforeEach(function () {
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

      describe('when doing a pull request build', function () {
        beforeEach(function () {
          env.TEAMCITY_PULL_REQUEST = '13'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          utils.readJsonFile.withArgs('.pr-bumper.json').returns(_config)
          utils.readJsonFile.withArgs('package.json').returns({})

          ctx.config = config = utils.getConfig()
        })

        verifyBitbucketTeamcityOverrides(ctx)
        verifyFeatureDefaults(ctx)

        it('should set isPr to true', function () {
          expect(config.computed.ci.isPr).to.equal(true)
        })

        it('should set prNumber to the PR number', function () {
          expect(config.computed.ci.prNumber).to.equal('13')
        })
      })

      describe('when doing a merge build', function () {
        beforeEach(function () {
          env.TEAMCITY_PULL_REQUEST = 'false'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          utils.readJsonFile.withArgs('.pr-bumper.json').returns(_config)
          utils.readJsonFile.withArgs('package.json').returns({})

          ctx.config = config = utils.getConfig()
        })

        verifyBitbucketTeamcityOverrides(ctx)
        verifyFeatureDefaults(ctx)

        it('should set isPr to false', function () {
          expect(config.computed.ci.isPr).to.equal(false)
        })

        it('should set prNumber to false', function () {
          expect(config.computed.ci.prNumber).to.equal('false')
        })
      })

      describe('when no branch env is given', function () {
        beforeEach(function () {
          delete _config.ci.env.branch

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          utils.readJsonFile.withArgs('.pr-bumper.json').returns(_config)
          utils.readJsonFile.withArgs('package.json').returns({})

          config = utils.getConfig()
        })

        it('should default to master branch', function () {
          expect(config.computed.ci.branch).to.equal('master')
        })
      })
    })
  })

  describe('.getValidatedScope()', function () {
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
      it(`should handle a scope of "${key}"`, function () {
        const ret = utils.getValidatedScope({
          scope: key,
          prNumber,
          prUrl
        })
        expect(ret).to.equal(value)
      })
    })

    it('should throw an error on invalid scope', function () {
      const fn = () => {
        utils.getValidatedScope({
          scope: 'foo-bar',
          prNumber,
          prUrl
        })
      }

      expect(fn).to.throw('Invalid version-bump scope "foo-bar" found for PR #12345 (my-pr-url)')
    })

    describe('when max scope is set', function () {
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

      Object.keys(maxScopes).forEach((maxScope) => {
        const {invalid, valid} = maxScopes[maxScope]
        describe(`with a maxScope of "${maxScope}"`, function () {
          valid.forEach((scope) => {
            it(`should be fine when scope is "${scope}"`, function () {
              const ret = utils.getValidatedScope({
                scope,
                maxScope,
                prNumber,
                prUrl
              })

              expect(ret).to.equal(scopes[scope])
            })
          })

          invalid.forEach((scope) => {
            it(`should throw an error when scope is "${scope}"`, function () {
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
              expect(fn).to.throw(msg)
            })
          })
        })
      })
    })
  })

  describe('.getScopeForPr()', function () {
    let pr, scope
    beforeEach(function () {
      pr = {
        description: '',
        number: '12345',
        url: 'my-pr-url'
      }
      sandbox.stub(utils, 'getValidatedScope').returns('the-validated-scope')
    })

    describe('when no version-bump present', function () {
      beforeEach(function () {
        pr.description = 'My super-cool new feature'
      })

      it('should throw an error', function () {
        const fn = () => {
          utils.getScopeForPr(pr)
        }

        const example = 'Please include a scope (e.g. `#major#`, `#minor#`, `#patch#`) in your PR description.'
        const exampleLink = 'See https://github.com/ciena-blueplanet/pr-bumper#pull-requests for more details.'
        expect(fn).to.throw(`No version-bump scope found for [PR #12345](my-pr-url)\n${example}\n${exampleLink}`)
      })
    })

    describe('when multiple version-bumps are present', function () {
      beforeEach(function () {
        pr.description = 'This is my cool #feature# or is it a #fix#?'
      })

      it('should throw an error', function () {
        const fn = () => {
          utils.getScopeForPr(pr)
        }

        expect(fn).to.throw('Too many version-bump scopes found for [PR #12345](my-pr-url)')
      })
    })

    describe('when a single version-bump is present', function () {
      beforeEach(function () {
        pr.description = 'This is my super-cool #feature#'
        scope = utils.getScopeForPr(pr)
      })

      it('should call .getValidatedScope() with proper arguments', function () {
        expect(utils.getValidatedScope).to.have.been.calledWith({
          scope: 'feature',
          maxScope: 'major',
          prNumber: '12345',
          prUrl: 'my-pr-url'
        })
      })

      it('should return the result of .getValidatedScope()', function () {
        expect(scope).to.equal('the-validated-scope')
      })
    })

    describe('when given a maxScope', function () {
      beforeEach(function () {
        pr.description = 'This is my super-cool #feature#'
        scope = utils.getScopeForPr(pr, 'minor')
      })

      it('should call .getValidatedScope() with proper arguments', function () {
        expect(utils.getValidatedScope).to.have.been.calledWith({
          scope: 'feature',
          maxScope: 'minor',
          prNumber: '12345',
          prUrl: 'my-pr-url'
        })
      })

      it('should return the result of .getValidatedScope()', function () {
        expect(scope).to.equal('the-validated-scope')
      })
    })

    describe('when GFM checkbox syntax is present with hyphen bullets', function () {
      describe('when single space in bullets', function () {
        describe('when no scope checked', function () {
          beforeEach(function () {
            pr.description = `
    ### Check the scope of this pr:
    - [ ] #none# - documentation fixes and/or test additions
    - [ ] #patch# - bugfix, dependency update
    - [ ] #minor# - new feature, backwards compatible
    - [ ] #major# - major feature, probably breaking API
    - [ ] #breaking# - any change that breaks the API`
          })

          it('should throw an error', function () {
            const fn = () => {
              utils.getScopeForPr(pr)
            }

            expect(fn).to.throw('No version-bump scope found for [PR #12345](my-pr-url)')
          })
        })

        describe('when one scope checked', function () {
          beforeEach(function () {
            pr.description = `
    ### Check the scope of this pr:
    - [ ] #none# - documentation fixes and/or test additions
    - [ ] #patch# - bugfix, dependency update
    - [x] #minor# - new feature, backwards compatible
    - [ ] #major# - major feature, probably breaking API
    - [ ] #breaking# - any change that breaks the API`
            scope = utils.getScopeForPr(pr)
          })

          it('should call .getValidatedScope() with proper arguments', function () {
            expect(utils.getValidatedScope).to.have.been.calledWith({
              scope: 'minor',
              maxScope: 'major',
              prNumber: '12345',
              prUrl: 'my-pr-url'
            })
          })
        })

        describe('when multiple scopes checked', function () {
          beforeEach(function () {
            pr.description = `
    ### Check the scope of this pr:
    - [x] #patch# - bugfix, dependency update
    - [ ] #minor# - new feature, backwards compatible
    - [x] #major# - major feature, probably breaking API
    - [ ] #breaking# - any change that breaks the API`
          })

          it('should throw an error', function () {
            const fn = () => {
              utils.getScopeForPr(pr)
            }

            expect(fn).to.throw('Too many version-bump scopes found for [PR #12345](my-pr-url)')
          })
        })

        describe('when one scope checked and other scopes mentioned', function () {
          beforeEach(function () {
            pr.description = `
    ### Check the scope of this pr:
    - [ ] #patch# - bugfix, dependency update
    - [x] #minor# - new feature, backwards compatible
    - [ ] #major# - major feature, probably breaking API
    - [ ] #breaking# - any change that breaks the API

    Thought this might be #breaking# but on second thought it is a minor change
    `
            scope = utils.getScopeForPr(pr)
          })

          it('should call .getValidatedScope() with proper arguments', function () {
            expect(utils.getValidatedScope).to.have.been.calledWith({
              scope: 'minor',
              maxScope: 'major',
              prNumber: '12345',
              prUrl: 'my-pr-url'
            })
          })
        })
      })

      describe('when multiple spaces in bullets', function () {
        describe('when no scope checked', function () {
          beforeEach(function () {
            pr.description = `
    ### Check the scope of this pr:
    -  [ ] #none# - documentation fixes and/or test additions
    -  [ ] #patch# - bugfix, dependency update
    -  [ ] #minor# - new feature, backwards compatible
    -  [ ] #major# - major feature, probably breaking API
    -  [ ] #breaking# - any change that breaks the API`
          })

          it('should throw an error', function () {
            const fn = () => {
              utils.getScopeForPr(pr)
            }

            expect(fn).to.throw('No version-bump scope found for [PR #12345](my-pr-url)')
          })
        })

        describe('when one scope checked', function () {
          beforeEach(function () {
            pr.description = `
    ### Check the scope of this pr:
    -  [ ] #none# - documentation fixes and/or test additions
    -  [ ] #patch# - bugfix, dependency update
    -  [x] #minor# - new feature, backwards compatible
    -  [ ] #major# - major feature, probably breaking API
    -  [ ] #breaking# - any change that breaks the API`
            scope = utils.getScopeForPr(pr)
          })

          it('should call .getValidatedScope() with proper arguments', function () {
            expect(utils.getValidatedScope).to.have.been.calledWith({
              scope: 'minor',
              maxScope: 'major',
              prNumber: '12345',
              prUrl: 'my-pr-url'
            })
          })
        })

        describe('when multiple scopes checked', function () {
          beforeEach(function () {
            pr.description = `
    ### Check the scope of this pr:
    -  [x] #patch# - bugfix, dependency update
    -  [ ] #minor# - new feature, backwards compatible
    -  [x] #major# - major feature, probably breaking API
    -  [ ] #breaking# - any change that breaks the API`
          })

          it('should throw an error', function () {
            const fn = () => {
              utils.getScopeForPr(pr)
            }

            expect(fn).to.throw('Too many version-bump scopes found for [PR #12345](my-pr-url)')
          })
        })

        describe('when one scope checked and other scopes mentioned', function () {
          beforeEach(function () {
            pr.description = `
    ### Check the scope of this pr:
    -  [ ] #patch# - bugfix, dependency update
    -  [x] #minor# - new feature, backwards compatible
    -  [ ] #major# - major feature, probably breaking API
    -  [ ] #breaking# - any change that breaks the API

    Thought this might be #breaking# but on second thought it is a minor change
    `
            scope = utils.getScopeForPr(pr)
          })

          it('should call .getValidatedScope() with proper arguments', function () {
            expect(utils.getValidatedScope).to.have.been.calledWith({
              scope: 'minor',
              maxScope: 'major',
              prNumber: '12345',
              prUrl: 'my-pr-url'
            })
          })
        })
      })
    })

    describe('when GFM checkbox syntax is present with asterisk bullets', function () {
      describe('when single space in bullets', function () {
        describe('when no scope checked', function () {
          beforeEach(function () {
            pr.description = `
    ### Check the scope of this pr:
    * [ ] #none# - documentation fixes and/or test additions
    * [ ] #patch# - bugfix, dependency update
    * [ ] #minor# - new feature, backwards compatible
    * [ ] #major# - major feature, probably breaking API
    * [ ] #breaking# - any change that breaks the API`
          })

          it('should throw an error', function () {
            const fn = () => {
              utils.getScopeForPr(pr)
            }

            expect(fn).to.throw('No version-bump scope found for [PR #12345](my-pr-url)')
          })
        })

        describe('when one scope checked', function () {
          beforeEach(function () {
            pr.description = `
    ### Check the scope of this pr:
    * [ ] #none# - documentation fixes and/or test additions
    * [ ] #patch# - bugfix, dependency update
    * [x] #minor# - new feature, backwards compatible
    * [ ] #major# - major feature, probably breaking API
    * [ ] #breaking# - any change that breaks the API`
            scope = utils.getScopeForPr(pr)
          })

          it('should call .getValidatedScope() with proper arguments', function () {
            expect(utils.getValidatedScope).to.have.been.calledWith({
              scope: 'minor',
              maxScope: 'major',
              prNumber: '12345',
              prUrl: 'my-pr-url'
            })
          })
        })

        describe('when multiple scopes checked', function () {
          beforeEach(function () {
            pr.description = `
    ### Check the scope of this pr:
    * [x] #patch# - bugfix, dependency update
    * [ ] #minor# - new feature, backwards compatible
    * [x] #major# - major feature, probably breaking API
    * [ ] #breaking# - any change that breaks the API`
          })

          it('should throw an error', function () {
            const fn = () => {
              utils.getScopeForPr(pr)
            }

            expect(fn).to.throw('Too many version-bump scopes found for [PR #12345](my-pr-url)')
          })
        })

        describe('when one scope checked and other scopes mentioned', function () {
          beforeEach(function () {
            pr.description = `
    ### Check the scope of this pr:
    * [ ] #patch# - bugfix, dependency update
    * [x] #minor# - new feature, backwards compatible
    * [ ] #major# - major feature, probably breaking API
    * [ ] #breaking# - any change that breaks the API

    Thought this might be #breaking# but on second thought it is a minor change
    `
            scope = utils.getScopeForPr(pr)
          })

          it('should call .getValidatedScope() with proper arguments', function () {
            expect(utils.getValidatedScope).to.have.been.calledWith({
              scope: 'minor',
              maxScope: 'major',
              prNumber: '12345',
              prUrl: 'my-pr-url'
            })
          })
        })
      })

      describe('when multiple spaces in bullets', function () {
        describe('when no scope checked', function () {
          beforeEach(function () {
            pr.description = `
    ### Check the scope of this pr:
    *  [ ] #none# - documentation fixes and/or test additions
    *  [ ] #patch# - bugfix, dependency update
    *  [ ] #minor# - new feature, backwards compatible
    *  [ ] #major# - major feature, probably breaking API
    *  [ ] #breaking# - any change that breaks the API`
          })

          it('should throw an error', function () {
            const fn = () => {
              utils.getScopeForPr(pr)
            }

            expect(fn).to.throw('No version-bump scope found for [PR #12345](my-pr-url)')
          })
        })

        describe('when one scope checked', function () {
          beforeEach(function () {
            pr.description = `
    ### Check the scope of this pr:
    *  [ ] #none# - documentation fixes and/or test additions
    *  [ ] #patch# - bugfix, dependency update
    *  [x] #minor# - new feature, backwards compatible
    *  [ ] #major# - major feature, probably breaking API
    *  [ ] #breaking# - any change that breaks the API`
            scope = utils.getScopeForPr(pr)
          })

          it('should call .getValidatedScope() with proper arguments', function () {
            expect(utils.getValidatedScope).to.have.been.calledWith({
              scope: 'minor',
              maxScope: 'major',
              prNumber: '12345',
              prUrl: 'my-pr-url'
            })
          })
        })

        describe('when multiple scopes checked', function () {
          beforeEach(function () {
            pr.description = `
    ### Check the scope of this pr:
    *  [x] #patch# - bugfix, dependency update
    *  [ ] #minor# - new feature, backwards compatible
    *  [x] #major# - major feature, probably breaking API
    *  [ ] #breaking# - any change that breaks the API`
          })

          it('should throw an error', function () {
            const fn = () => {
              utils.getScopeForPr(pr)
            }

            expect(fn).to.throw('Too many version-bump scopes found for [PR #12345](my-pr-url)')
          })
        })

        describe('when one scope checked and other scopes mentioned', function () {
          beforeEach(function () {
            pr.description = `
    ### Check the scope of this pr:
    *  [ ] #patch# - bugfix, dependency update
    *  [x] #minor# - new feature, backwards compatible
    *  [ ] #major# - major feature, probably breaking API
    *  [ ] #breaking# - any change that breaks the API

    Thought this might be #breaking# but on second thought it is a minor change
    `
            scope = utils.getScopeForPr(pr)
          })

          it('should call .getValidatedScope() with proper arguments', function () {
            expect(utils.getValidatedScope).to.have.been.calledWith({
              scope: 'minor',
              maxScope: 'major',
              prNumber: '12345',
              prUrl: 'my-pr-url'
            })
          })
        })
      })
    })
  })

  describe('.getChangelogForPr()', function () {
    const link = 'https://github.com/ciena-blueplanet/pr-bumper#changelog'
    const errorMsg = 'No CHANGELOG content found in PR description.\n' +
      'Please add a `# CHANGELOG` section to your PR description with some content describing your change.\n' +
      `See ${link} for details.`

    let pr, changelog

    beforeEach(function () {
      pr = {
        description: '',
        number: '12345',
        url: 'my-pr-url'
      }
    })

    describe('when no changelog present', function () {
      beforeEach(function () {
        pr.description = 'My super-cool new feature'
      })

      it('should throw an error', function () {
        expect(() => {
          utils.getChangelogForPr(pr)
        }).to.throw(Error, errorMsg)
      })
    })

    describe('when changelog empty', function () {
      beforeEach(function () {
        pr.description = 'My super-cool new feature\n #CHANGELOG'
      })

      it('should throw an error', function () {
        expect(() => {
          utils.getChangelogForPr(pr)
        }).to.throw(Error, errorMsg)
      })
    })

    describe('when multiple changelog sections are present', function () {
      beforeEach(function () {
        pr.description = '#CHANGELOG\n## Fixes\nFoo, Bar, Baz\n#changelog\n## Features\nFizz, Bang'
      })

      it('should throw an error', function () {
        expect(() => {
          utils.getChangelogForPr(pr)
        }).to.throw(Error, 'Multiple changelog sections found. Line 1 and line 4.')
      })
    })

    describe('when changelog section is present', function () {
      beforeEach(function () {
        pr.description = '#changelog\r\n## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang'
        changelog = utils.getChangelogForPr(pr)
      })

      it('should grab the changelog text', function () {
        expect(changelog).to.deep.equal('## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang')
      })
    })

    describe('when changelog section has extra space at the end', function () {
      beforeEach(function () {
        pr.description = '# CHANGELOG    \n## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang'
        changelog = utils.getChangelogForPr(pr)
      })

      it('should grab the changelog text', function () {
        expect(changelog).to.deep.equal('## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang')
      })
    })
  })

  describe('.getCurrentCoverage()', function () {
    let config, coverageSummary, pct
    beforeEach(function () {
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

    describe('when no coverage present', function () {
      beforeEach(function () {
        utils.readJsonFile.withArgs('path-to-coverage/coverage-file.json').returns({})
        pct = utils.getCurrentCoverage(config)
      })

      it('should return -1', function () {
        expect(pct).to.equal(-1)
      })
    })

    describe('when coverage is present', function () {
      beforeEach(function () {
        utils.readJsonFile.withArgs('path-to-coverage/coverage-file.json').returns(coverageSummary)
        pct = utils.getCurrentCoverage(config)
      })

      it('should return the total statement and branch pct', function () {
        expect(pct).to.equal(89.00)
      })
    })

    describe('when coverage is present (but no branches)', function () {
      beforeEach(function () {
        utils.readJsonFile.withArgs('path-to-coverage/coverage-file.json').returns({
          total: {
            branches: {
              total: 0,
              covered: 0
            },
            statements: {
              total: 100,
              covered: 80
            }
          }
        })
        pct = utils.getCurrentCoverage(config)
      })

      it('should return the total statement and branch pct', function () {
        expect(pct).to.equal(80.00)
      })
    })
  })

  describe('.maybePostComment()', function () {
    let config, resolver, vcs, result, error
    beforeEach(function () {
      config = {
        computed: {
          ci: {
            isPr: true,
            prNumber: '123'
          }
        },
        isEnabled () {}
      }

      sandbox.stub(config, 'isEnabled')

      resolver = {}
      resolver.promise = new Promise((resolve, reject) => {
        resolver.resolve = resolve
        resolver.reject = reject
      })

      vcs = {
        postComment: sandbox.stub().returns(resolver.promise)
      }

      result = error = null
    })

    describe('when feature is not enabled', function () {
      beforeEach(function (done) {
        config.isEnabled.withArgs('comments').returns(false)
        utils.maybePostComment(config, vcs, 'fizz-bang')
          .then((resp) => {
            result = resp
          })
          .catch((err) => {
            error = err
          })

        setTimeout(() => {
          done()
        }, 0)
      })

      it('should not post a comment', function () {
        expect(vcs.postComment).to.have.callCount(0)
      })

      it('should not reject', function () {
        expect(error).to.equal(null)
      })

      it('should resolve', function () {
        expect(result).to.equal(undefined)
      })
    })

    describe('when feature is enabled, but isPr is false', function () {
      beforeEach(function (done) {
        config.computed.ci.isPr = false
        config.isEnabled.withArgs('comments').returns(true)

        utils.maybePostComment(config, vcs, 'fizz-bang')
          .then((resp) => {
            result = resp
          })
          .catch((err) => {
            error = err
          })

        setTimeout(() => {
          done()
        }, 0)
      })

      it('should not post a comment', function () {
        expect(vcs.postComment).to.have.callCount(0)
      })

      it('should not reject', function () {
        expect(error).to.equal(null)
      })

      it('should resolve', function () {
        expect(result).to.equal(undefined)
      })
    })

    describe('when feature is enabled, and isPr is true, but SKIP_COMMENTS is in env', function () {
      let realSkipComments
      beforeEach(function (done) {
        realSkipComments = process.env['SKIP_COMMENTS']
        process.env['SKIP_COMMENTS'] = '1'
        config.computed.ci.isPr = true
        config.isEnabled.withArgs('comments').returns(true)

        utils.maybePostComment(config, vcs, 'fizz-bang')
          .then((resp) => {
            result = resp
          })
          .catch((err) => {
            error = err
          })

        setTimeout(() => {
          done()
        }, 0)
      })

      afterEach(function () {
        if (realSkipComments !== undefined) {
          process.env['SKIP_COMMENTS'] = realSkipComments
        } else {
          delete process.env['SKIP_COMMENTS']
        }
      })

      it('should not post a comment', function () {
        expect(vcs.postComment).to.have.callCount(0)
      })

      it('should not reject', function () {
        expect(error).to.equal(null)
      })

      it('should resolve', function () {
        expect(result).to.equal(undefined)
      })
    })

    describe('when feature is enabled and isPr is true (and no SKIP_COMMENTS is present)', function () {
      let promise
      beforeEach(function () {
        config.isEnabled.withArgs('comments').returns(true)

        promise = utils.maybePostComment(config, vcs, 'fizz-bang')
          .then((resp) => {
            result = resp
          })
          .catch((err) => {
            error = err
            throw err
          })
      })

      it('should post a comment', function () {
        expect(vcs.postComment).to.have.been.calledWith(config.computed.ci.prNumber, 'fizz-bang')
      })

      it('should not reject yet', function () {
        expect(error).to.equal(null)
      })

      it('should not resolve yet', function () {
        expect(result).to.equal(null)
      })

      describe('when postComment succeeds', function () {
        beforeEach(function () {
          resolver.resolve()
          return promise
        })

        it('should not reject', function () {
          expect(error).to.equal(null)
        })

        it('should resolve', function () {
          expect(result).to.equal(undefined)
        })
      })

      describe('when postComment fails', function () {
        beforeEach(function (done) {
          resolver.reject(new Error('Aw snap!'))
          promise.catch(() => {
            done()
          })
        })

        it('should reject with a combined error', function () {
          const msg = 'Received error: Aw snap! while trying to post PR comment: fizz-bang'
          expect(error.message).to.equal(msg)
        })

        it('should not resolve', function () {
          expect(result).to.equal(null)
        })
      })
    })

    describe('when feature is enabled and isPr is true, and isError is true', function () {
      let promise
      beforeEach(function () {
        config.isEnabled.withArgs('comments').returns(true)

        promise = utils.maybePostComment(config, vcs, 'fizz-bang', true)
          .then((resp) => {
            result = resp
          })
          .catch((err) => {
            error = err
            throw err
          })
      })

      it('should post a comment', function () {
        expect(vcs.postComment).to.have.been.calledWith(config.computed.ci.prNumber, '## ERROR\nfizz-bang')
      })

      it('should not reject yet', function () {
        expect(error).to.equal(null)
      })

      it('should not resolve yet', function () {
        expect(result).to.equal(null)
      })

      describe('when postComment succeeds', function () {
        beforeEach(function () {
          resolver.resolve()
          return promise
        })

        it('should not reject', function () {
          expect(error).to.equal(null)
        })

        it('should resolve', function () {
          expect(result).to.equal(undefined)
        })
      })

      describe('when postComment fails', function () {
        beforeEach(function (done) {
          resolver.reject(new Error('Aw snap!'))
          promise.catch(() => {
            done()
          })
        })

        it('should reject with a combined error', function () {
          const msg = 'Received error: Aw snap! while trying to post PR comment: ## ERROR\nfizz-bang'
          expect(error.message).to.equal(msg)
        })

        it('should not resolve', function () {
          expect(result).to.equal(null)
        })
      })
    })
  })

  describe('.maybePostCommentOnError()', function () {
    let config, resolver, vcs, func, result, error
    beforeEach(function () {
      config = {
        computed: {
          ci: {
            isPr: true,
            prNumber: '123'
          }
        },
        isEnabled () {}
      }

      sandbox.stub(config, 'isEnabled')

      resolver = {}
      resolver.promise = new Promise((resolve, reject) => {
        resolver.resolve = resolve
        resolver.reject = reject
      })

      vcs = {
        postComment: sandbox.stub().returns(resolver.promise)
      }

      func = sandbox.stub()
      result = error = null
    })

    describe('when func succeeds', function () {
      beforeEach(function () {
        func.returns('foo')
        return utils.maybePostCommentOnError(config, vcs, func)
          .then((resp) => {
            result = resp
          })
          .catch((err) => {
            error = err
            throw err
          })
      })

      it('should call the func', function () {
        expect(func).to.have.callCount(1)
      })

      it('should not post a comment', function () {
        expect(vcs.postComment).to.have.callCount(0)
      })

      it('should not reject', function () {
        expect(error).to.equal(null)
      })

      it('should resolve with the return value of func', function () {
        expect(result).to.equal('foo')
      })
    })

    describe('when func throws an error', function () {
      beforeEach(function () {
        func.throws(new Error('Uh oh!'))
      })

      describe('and feature is not enabled', function () {
        beforeEach(function (done) {
          config.isEnabled.withArgs('comments').returns(false)
          utils.maybePostCommentOnError(config, vcs, func)
            .then((resp) => {
              result = resp
            })
            .catch((err) => {
              error = err
              done()
            })
        })

        it('should call the func', function () {
          expect(func).to.have.callCount(1)
        })

        it('should not post a comment', function () {
          expect(vcs.postComment).to.have.callCount(0)
        })

        it('should reject with the error thrown', function () {
          expect(error).to.deep.equal(new Error('Uh oh!'))
        })

        it('should not resolve', function () {
          expect(result).to.equal(null)
        })
      })

      describe('and feature is enabled but isPr is false', function () {
        beforeEach(function (done) {
          config.computed.ci.isPr = false
          config.isEnabled.withArgs('comments').returns(true)

          utils.maybePostCommentOnError(config, vcs, func)
            .then((resp) => {
              result = resp
            })
            .catch((err) => {
              error = err
              done()
            })
        })

        it('should call the func', function () {
          expect(func).to.have.callCount(1)
        })

        it('should not post a comment', function () {
          expect(vcs.postComment).to.have.callCount(0)
        })

        it('should reject with the error thrown', function () {
          expect(error).to.deep.equal(new Error('Uh oh!'))
        })

        it('should not resolve', function () {
          expect(result).to.equal(null)
        })
      })

      describe('and prComments is true and isPr is true', function () {
        let promise
        beforeEach(function () {
          config.computed.ci.isPr = true
          config.isEnabled.withArgs('comments').returns(true)

          promise = utils.maybePostCommentOnError(config, vcs, func)
            .then((resp) => {
              result = resp
            })
            .catch((err) => {
              error = err
              throw err
            })
        })

        it('should call the func', function () {
          expect(func).to.have.callCount(1)
        })

        it('should post a comment', function () {
          expect(vcs.postComment).to.have.been.calledWith(config.computed.ci.prNumber, '## ERROR\nUh oh!')
        })

        it('should not reject yet', function () {
          expect(error).to.equal(null)
        })

        it('should not resolve', function () {
          expect(result).to.equal(null)
        })

        describe('when postComment succeeds', function () {
          beforeEach(function (done) {
            resolver.resolve()
            promise.catch(() => {
              done()
            })
          })

          it('should reject with the original error', function () {
            expect(error.message).to.equal('Uh oh!')
          })

          it('should not resolve', function () {
            expect(result).to.equal(null)
          })
        })

        describe('when postComment fails', function () {
          beforeEach(function (done) {
            resolver.reject(new Error('Aw snap!'))
            promise.catch(() => {
              done()
            })
          })

          it('should reject with a combined error', function () {
            const msg = 'Received error: Aw snap! while trying to post PR comment about error: Uh oh!'
            expect(error.message).to.equal(msg)
          })

          it('should not resolve', function () {
            expect(result).to.equal(null)
          })
        })
      })
    })
  })
})
