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
        expect(config.ci.gitUser).to.eql({
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

    if (propsToSkip.indexOf('owner') === -1) {
      it('should have the proper owner', function () {
        expect(config.owner).to.equal('jdoe')
      })
    }

    if (propsToSkip.indexOf('branch') === -1) {
      it('should have the proper branch', function () {
        expect(config.branch).to.equal('my-branch')
      })
    }

    if (propsToSkip.indexOf('repo') === -1) {
      it('should have the proper repo', function () {
        expect(config.repo).to.equal('john-and-jane')
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

    if (propsToSkip.indexOf('vcs.auth') === -1) {
      it('should have the proper vcs auth', function () {
        expect(config.vcs.auth).to.eql({
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

    if (propsToSkip.indexOf('changelogFile') === -1) {
      it('should default changelogFile to "CHANGELOG.md"', function () {
        expect(config.changelogFile).to.equal('CHANGELOG.md')
      })
    }

    if (propsToSkip.indexOf('prComments') === -1) {
      it('should default prComments to false', function () {
        expect(config.prComments).to.equal(false)
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
      expect(config.ci.gitUser).to.eql({
        email: 'teamcity@domain.com',
        name: 'teamcity'
      })
    })

    it('should have the proper ci provider', function () {
      expect(config.ci.provider).to.equal('teamcity')
    })

    it('should have the proper owner', function () {
      expect(config.owner).to.equal('my-project')
    })

    it('should have the proper repo', function () {
      expect(config.repo).to.equal('my-repo')
    })

    it('should have the proper branch', function () {
      expect(config.branch).to.equal('my-branch')
    })

    it('should have the proper vcs domain', function () {
      expect(config.vcs.domain).to.equal('bitbucket.domain.com')
    })

    it('should have the proper vcs provider', function () {
      expect(config.vcs.provider).to.equal('bitbucket-server')
    })

    it('should have the proper vcs auth', function () {
      expect(config.vcs.auth).to.eql({
        password: 'teamcity12345',
        readToken: undefined,
        username: 'teamcity',
        writeToken: undefined
      })
    })

    it('should default dependencySnapshotFile to "dependency-snapshot.json"', function () {
      expect(config.dependencySnapshotFile).to.equal('dependency-snapshot.json')
    })

    it('should default changelogFile to "CHANGELOG.md"', function () {
      expect(config.changelogFile).to.equal('CHANGELOG.md')
    })

    it('should default prComments to false', function () {
      expect(config.prComments).to.equal(false)
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

      describe('when doing a pull request build (w/o coverage in package.json)', function () {
        beforeEach(function () {
          env.TRAVIS_PULL_REQUEST = '13'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          config = utils.getConfig(null, {})
          ctx.config = config
        })

        verifyGitHubTravisDefaults(ctx)

        it('should set isPr to true', function () {
          expect(config.isPr).to.equal(true)
        })

        it('should set prNumber to the PR number', function () {
          expect(config.prNumber).to.equal('13')
        })

        it('should not have a baselineCoverage set', function () {
          expect(config.baselineCoverage).to.equal(undefined)
        })
      })

      describe('when doing a pull request build (with coverage in package.json)', function () {
        beforeEach(function () {
          env.TRAVIS_PULL_REQUEST = '13'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          const pkgJson = {
            'pr-bumper': {
              coverage: 85.93
            }
          }
          config = utils.getConfig(null, pkgJson)
          ctx.config = config
        })

        verifyGitHubTravisDefaults(ctx)

        it('should set isPr to true', function () {
          expect(config.isPr).to.equal(true)
        })

        it('should set prNumber to the PR number', function () {
          expect(config.prNumber).to.equal('13')
        })

        it('should set baselineCoverage to the coverage from package.json', function () {
          expect(config.baselineCoverage).to.equal(85.93)
        })
      })

      describe('when doing a merge build (w/o coverage in package.json)', function () {
        beforeEach(function () {
          env.TRAVIS_PULL_REQUEST = 'false'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          config = utils.getConfig(null, {})
          ctx.config = config
        })

        verifyGitHubTravisDefaults(ctx)

        it('should set isPr to false', function () {
          expect(config.isPr).to.equal(false)
        })

        it('should set prNumber to false', function () {
          expect(config.prNumber).to.equal('false')
        })

        it('should not have a baselineCoverage set', function () {
          expect(config.baselineCoverage).to.equal(undefined)
        })
      })

      describe('when doing a merge build (with coverage in package.json)', function () {
        beforeEach(function () {
          const pkgJson = {
            'pr-bumper': {
              coverage: 85.93
            }
          }
          env.TRAVIS_PULL_REQUEST = 'false'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          config = utils.getConfig(null, pkgJson)
          ctx.config = config
        })

        verifyGitHubTravisDefaults(ctx)

        it('should set isPr to false', function () {
          expect(config.isPr).to.equal(false)
        })

        it('should set prNumber to false', function () {
          expect(config.prNumber).to.equal('false')
        })

        it('should set baselineCoverage to the coverage from package.json', function () {
          expect(config.baselineCoverage).to.equal(85.93)
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
          expect(config.ci.gitUser).to.eql({
            email: 'some.other.user@domain.com',
            name: 'Some Other User'
          })
        })
      })

      describe('when pr env is missing', function () {
        let _config
        beforeEach(function () {
          env.TRAVIS_PULL_REQUEST = undefined
          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          config = utils.getConfig(_config)
          ctx.config = config
        })

        it('should not consider it a PR', function () {
          expect(config.isPr).to.equal(false)
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
          vcs: {
            domain: 'ghe.domain.com',
            provider: 'github-enterprise'
          },
          prComments: true
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

          config = utils.getConfig(_config, {})
          ctx.config = config
        })

        verifyGitHubTravisDefaults(ctx, ['ci.gitUser', 'vcs.domain', 'vcs.provider', 'prComments'])

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
          expect(config.prNumber).to.equal('13')
        })

        it('should not have a baselineCoverage set', function () {
          expect(config.baselineCoverage).to.equal(undefined)
        })

        it('should have the proper prComments value', function () {
          expect(config.prComments).to.equal(true)
        })
      })

      describe('when doing a pull request build (with coverage in package.json)', function () {
        beforeEach(function () {
          env.TRAVIS_PULL_REQUEST = '13'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          config = utils.getConfig(_config, _pkgJson)
          ctx.config = config
        })

        verifyGitHubTravisDefaults(ctx, ['ci.gitUser', 'vcs.domain', 'vcs.provider', 'prComments'])

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
          expect(config.prNumber).to.equal('13')
        })

        it('should set baselineCoverage to the coverage from package.json', function () {
          expect(config.baselineCoverage).to.equal(98.03)
        })

        it('should have the proper prComments value', function () {
          expect(config.prComments).to.equal(true)
        })
      })

      describe('when doing a merge build (w/o coverage in package.json)', function () {
        beforeEach(function () {
          env.TRAVIS_PULL_REQUEST = 'false'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          config = utils.getConfig(_config, {})
          ctx.config = config
        })

        verifyGitHubTravisDefaults(ctx, ['ci.gitUser', 'vcs.domain', 'vcs.provider', 'prComments'])

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
          expect(config.prNumber).to.equal('false')
        })

        it('should not have a baselineCoverage set', function () {
          expect(config.baselineCoverage).to.equal(undefined)
        })

        it('should have the proper prComments value', function () {
          expect(config.prComments).to.equal(true)
        })
      })

      describe('when doing a merge build (with coverage in package.json)', function () {
        beforeEach(function () {
          env.TRAVIS_PULL_REQUEST = 'false'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          config = utils.getConfig(_config, _pkgJson)
          ctx.config = config
        })

        verifyGitHubTravisDefaults(ctx, ['ci.gitUser', 'vcs.domain', 'vcs.provider', 'prComments'])

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
          expect(config.prNumber).to.equal('false')
        })

        it('should set baselineCoverage to the coverage from package.json', function () {
          expect(config.baselineCoverage).to.equal(98.03)
        })

        it('should have the proper prComments value', function () {
          expect(config.prComments).to.equal(true)
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
          expect(config.prNumber).to.equal('13')
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
          expect(config.prNumber).to.equal('false')
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
          expect(config.branch).to.equal('master')
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
        expect(utils.getValidatedScope(key, prNum, prUrl)).to.equal(value)
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

        const example = 'Please include a scope (i.e. `#major`, `#minor#`, `#patch#`) in your PR description.'
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
        expect(utils.getValidatedScope.lastCall.args).to.eql(['feature', '12345', 'my-pr-url'])
      })

      it('should return the result of .getValidatedScope()', function () {
        expect(scope).to.equal('the-validated-scope')
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
        expect(utils.getValidatedScope.lastCall.args).to.eql(['minor', '12345', 'my-pr-url'])
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

        expect(fn).to.throw('Too many version-bump scopes found for [PR #12345](my-pr-url)')
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
        expect(utils.getValidatedScope.lastCall.args).to.eql(['minor', '12345', 'my-pr-url'])
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
        expect(changelog).to.eql('## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang')
      })
    })

    describe('when changelog section has extra space at the end', function () {
      beforeEach(function () {
        pr.description = '# CHANGELOG    \n## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang'
        changelog = utils.getChangelogForPr(pr)
      })

      it('should grab the changelog text', function () {
        expect(changelog).to.eql('## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang')
      })
    })
  })

  describe('.getCurrentCoverage()', function () {
    let cov, pct
    beforeEach(function () {
      cov = {
        total: {
          lines: {
            pct: 95.98
          }
        }
      }
    })

    describe('when no coverage present', function () {
      beforeEach(function () {
        pct = utils.getCurrentCoverage({})
      })

      it('should return -1', function () {
        expect(pct).to.equal(-1)
      })
    })

    describe('when coverage is present', function () {
      beforeEach(function () {
        pct = utils.getCurrentCoverage(cov)
      })

      it('should return the total line pct', function () {
        expect(pct).to.equal(95.98)
      })
    })
  })

  describe('.maybePostComment()', function () {
    let config, resolver, vcs, result, error
    beforeEach(function () {
      config = {
        isPr: true,
        prComments: false,
        prNumber: '123'
      }

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

    describe('when prComments is false', function () {
      beforeEach(function (done) {
        config.prComments = false
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

    describe('when prComments is true, but isPr is false', function () {
      beforeEach(function (done) {
        config.isPr = false
        config.prComments = true
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

    describe('and prComments is true and isPr is true', function () {
      let promise
      beforeEach(function () {
        config.prComments = true
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
        expect(vcs.postComment).to.have.been.calledWith(config.prNumber, 'fizz-bang')
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

    describe('and prComments is true and isPr is true, and isError is true', function () {
      let promise
      beforeEach(function () {
        config.prComments = true
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
        expect(vcs.postComment).to.have.been.calledWith(config.prNumber, '## ERROR\nfizz-bang')
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
        isPr: true,
        prComments: false,
        prNumber: '123'
      }

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

      describe('and prComments is false', function () {
        beforeEach(function (done) {
          config.prComments = false
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
          expect(error).to.eql(new Error('Uh oh!'))
        })

        it('should not resolve', function () {
          expect(result).to.equal(null)
        })
      })

      describe('and prComments is true but isPr is false', function () {
        beforeEach(function (done) {
          config.isPr = false
          config.prComments = true
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
          expect(error).to.eql(new Error('Uh oh!'))
        })

        it('should not resolve', function () {
          expect(result).to.equal(null)
        })
      })

      describe('and prComments is true and isPr is true', function () {
        let promise
        beforeEach(function () {
          config.isPr = true
          config.prComments = true
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
          expect(vcs.postComment).to.have.been.calledWith(config.prNumber, '## ERROR\nUh oh!')
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
