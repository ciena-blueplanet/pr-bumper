'use strict'

const __ = require('lodash')
const expect = require('chai').expect
const sinon = require('sinon')

const logger = require('../lib/logger')
const utils = require('../lib/utils')

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
        expect(config.ci.gitUser).to.be.eql({
          email: 'travis.ci.ciena@gmail.com',
          name: 'Travis CI'
        })
      })
    }

    if (propsToSkip.indexOf('ci.provider') === -1) {
      it('should use the proper ci provider', function () {
        expect(config.ci.provider).to.be.equal('travis')
      })
    }

    if (propsToSkip.indexOf('owner') === -1) {
      it('should have the proper owner', function () {
        expect(config.owner).to.be.equal('jdoe')
      })
    }

    if (propsToSkip.indexOf('branch') === -1) {
      it('should have the proper branch', function () {
        expect(config.branch).to.be.equal('my-branch')
      })
    }

    if (propsToSkip.indexOf('repo') === -1) {
      it('should have the proper repo', function () {
        expect(config.repo).to.be.equal('john-and-jane')
      })
    }

    if (propsToSkip.indexOf('vcs.domain') === -1) {
      it('should have the proper vcs domain', function () {
        expect(config.vcs.domain).to.be.equal('github.com')
      })
    }

    if (propsToSkip.indexOf('vcs.provider') === -1) {
      it('should have the proper vcs provider', function () {
        expect(config.vcs.provider).to.be.equal('github')
      })
    }

    if (propsToSkip.indexOf('vcs.auth') === -1) {
      it('should have the proper vcs auth', function () {
        expect(config.vcs.auth).to.be.eql({
          password: undefined,
          readToken: '12345',
          username: undefined,
          writeToken: '54321'
        })
      })
    }

    if (propsToSkip.indexOf('dependencySnapshotFile') === -1) {
      it('should default dependencySnapshotFile to "dependency-snapshot.json"', function () {
        expect(config.dependencySnapshotFile).to.equal('dependency-snapshot.json')
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
      expect(config.ci.gitUser).to.be.eql({
        email: 'teamcity@domain.com',
        name: 'teamcity'
      })
    })

    it('should have the proper ci provider', function () {
      expect(config.ci.provider).to.be.equal('teamcity')
    })

    it('should have the proper owner', function () {
      expect(config.owner).to.be.equal('my-project')
    })

    it('should have the proper repo', function () {
      expect(config.repo).to.be.equal('my-repo')
    })

    it('should have the proper branch', function () {
      expect(config.branch).to.be.equal('my-branch')
    })

    it('should have the proper vcs domain', function () {
      expect(config.vcs.domain).to.be.equal('bitbucket.domain.com')
    })

    it('should have the proper vcs provider', function () {
      expect(config.vcs.provider).to.be.equal('bitbucket-server')
    })

    it('should have the proper vcs auth', function () {
      expect(config.vcs.auth).to.be.eql({
        password: 'teamcity12345',
        readToken: undefined,
        username: 'teamcity',
        writeToken: undefined
      })
    })

    it('should default dependencySnapshotFile to "dependency-snapshot.json"', function () {
      expect(config.dependencySnapshotFile).to.equal('dependency-snapshot.json')
    })
  })
}

describe('utils', function () {
  let sandbox

  beforeEach(function () {
    sandbox = sinon.sandbox.create()
    sandbox.stub(logger, 'log')
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

      describe('when doing a pull request build', function () {
        beforeEach(function () {
          env.TRAVIS_PULL_REQUEST = '13'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          config = utils.getConfig()
          ctx.config = config
        })

        verifyGitHubTravisDefaults(ctx)

        it('should set isPr to true', function () {
          expect(config.isPr).to.equal(true)
        })

        it('should set prNumber to the PR number', function () {
          expect(config.prNumber).to.be.equal('13')
        })
      })

      describe('when doing a merge build', function () {
        beforeEach(function () {
          env.TRAVIS_PULL_REQUEST = 'false'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          config = utils.getConfig()
          ctx.config = config
        })

        verifyGitHubTravisDefaults(ctx)

        it('should set isPr to false', function () {
          expect(config.isPr).to.equal(false)
        })

        it('should set prNumber to false', function () {
          expect(config.prNumber).to.be.equal('false')
        })
      })

      describe('when a partial config is given', function () {
        let _config
        beforeEach(function () {
          _config = {
            ci: {
              gitUser: {
                email: 'some.other.user@domain.com',
                name: 'Some Other User'
              }
            }
          }

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          config = utils.getConfig(_config)
          ctx.config = config
        })

        verifyGitHubTravisDefaults(ctx, ['ci.gitUser'])

        it('should use the overwritten git user', function () {
          expect(config.ci.gitUser).to.be.eql({
            email: 'some.other.user@domain.com',
            name: 'Some Other User'
          })
        })
      })
    })

    describe('GitHubEnterprise/Travis', function () {
      const ctx = {}
      let _config
      beforeEach(function () {
        _config = {
          ci: {
            gitUser: {
              email: 'bot@domain.com',
              name: 'Bot User'
            }
          },
          vcs: {
            domain: 'ghe.domain.com',
            provider: 'github-enterprise'
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

      describe('when doing a pull request build', function () {
        beforeEach(function () {
          env.TRAVIS_PULL_REQUEST = '13'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          config = utils.getConfig(_config)
          ctx.config = config
        })

        verifyGitHubTravisDefaults(ctx, ['ci.gitUser', 'vcs.domain', 'vcs.provider'])

        it('should have the proper gitUser', function () {
          expect(config.ci.gitUser).to.eql({
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
          expect(config.isPr).to.equal(true)
        })

        it('should set prNumber to the PR number', function () {
          expect(config.prNumber).to.be.equal('13')
        })
      })

      describe('when doing a merge build', function () {
        beforeEach(function () {
          env.TRAVIS_PULL_REQUEST = 'false'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          config = utils.getConfig(_config)
          ctx.config = config
        })

        verifyGitHubTravisDefaults(ctx, ['ci.gitUser', 'vcs.domain', 'vcs.provider'])

        it('should have the proper gitUser', function () {
          expect(config.ci.gitUser).to.eql({
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
          expect(config.isPr).to.equal(false)
        })

        it('should set prNumber to false', function () {
          expect(config.prNumber).to.be.equal('false')
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
          owner: 'my-project',
          repo: 'my-repo',
          vcs: {
            domain: 'bitbucket.domain.com',
            env: {
              username: 'VCS_USERNAME',
              password: 'VCS_PASSWORD'
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

          config = utils.getConfig(_config)
          ctx.config = config
        })

        verifyBitbucketTeamcityOverrides(ctx)

        it('should set isPr to true', function () {
          expect(config.isPr).to.equal(true)
        })

        it('should set prNumber to the PR number', function () {
          expect(config.prNumber).to.be.equal('13')
        })
      })

      describe('when doing a merge build', function () {
        beforeEach(function () {
          env.TEAMCITY_PULL_REQUEST = 'false'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          config = utils.getConfig(_config)
        })

        verifyBitbucketTeamcityOverrides(ctx)

        it('should set isPr to false', function () {
          expect(config.isPr).to.equal(false)
        })

        it('should set prNumber to false', function () {
          expect(config.prNumber).to.be.equal('false')
        })
      })

      describe('when no branch env is given', function () {
        beforeEach(function () {
          delete _config.ci.env.branch

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          config = utils.getConfig(_config)
        })

        it('should default to master branch', function () {
          expect(config.branch).to.be.equal('master')
        })
      })
    })
  })

  describe('.getValidatedScope()', function () {
    const prUrl = 'my-pr-url'
    const prNum = '12345'
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
      it(`handles ${key}`, function () {
        expect(utils.getValidatedScope(key, prNum, prUrl)).to.be.equal(value)
      })
    })

    it('should throw on invalid scope', function () {
      const fn = () => {
        utils.getValidatedScope('foo-bar', prNum, prUrl)
      }

      expect(fn).to.throw('Invalid version-bump scope [foo-bar] found for PR #12345 (my-pr-url)')
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

        expect(fn).to.throw('No version-bump scope found for PR #12345 (my-pr-url)')
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

        expect(fn).to.throw('Too many version-bump scopes found for PR #12345 (my-pr-url)')
      })
    })

    describe('when a single version-bump is present', function () {
      beforeEach(function () {
        pr.description = 'This is my super-cool #feature#'
        scope = utils.getScopeForPr(pr)
      })

      it('should call .getValidatedScope() with proper arguments', function () {
        expect(utils.getValidatedScope.lastCall.args).to.be.eql(['feature', '12345', 'my-pr-url'])
      })

      it('should return the result of .getValidatedScope()', function () {
        expect(scope).to.be.equal('the-validated-scope')
      })
    })

    describe('when GFM checkbox syntax is present with one scope checked', function () {
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
        expect(utils.getValidatedScope.lastCall.args).to.be.eql(['minor', '12345', 'my-pr-url'])
      })
    })

    describe('when GFM checkbox syntax is present with multiple scopes checked', function () {
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

        expect(fn).to.throw('Too many version-bump scopes found for PR #12345 (my-pr-url)')
      })
    })

    describe('when GFM checkbox syntax is present with one scope checked and other scopes mentioned', function () {
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
        expect(utils.getValidatedScope.lastCall.args).to.be.eql(['minor', '12345', 'my-pr-url'])
      })
    })
  })

  describe('.getChangelogForPr()', function () {
    const errorMsg = 'No CHANGELOG content found in PR description.\n' +
      'Please add a "# CHANGELOG" section to your PR description with some content describing your change'

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
        expect(changelog).to.be.eql('## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang')
      })
    })

    describe('when changelog section has extra space at the end', function () {
      beforeEach(function () {
        pr.description = '# CHANGELOG    \n## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang'
        changelog = utils.getChangelogForPr(pr)
      })

      it('should grab the changelog text', function () {
        expect(changelog).to.be.eql('## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang')
      })
    })
  })
})
