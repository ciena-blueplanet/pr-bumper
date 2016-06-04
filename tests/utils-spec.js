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
 */
function verifyGitHubTravisDefaults (ctx) {
  describe('uses the right github/travis default', () => {
    let config
    beforeEach(() => {
      config = ctx.config
    })

    it('git user', () => {
      expect(config.ci.gitUser).to.be.eql({
        email: 'travis.ci.ciena@gmail.com',
        name: 'Travis CI'
      })
    })

    it('ci provider', () => {
      expect(config.ci.provider).to.be.equal('travis')
    })

    it('owner', () => {
      expect(config.owner).to.be.equal('jdoe')
    })

    it('repo', () => {
      expect(config.repo).to.be.equal('john-and-jane')
    })

    it('vcs domain', () => {
      expect(config.vcs.domain).to.be.equal('github.com')
    })

    it('vcs provider', () => {
      expect(config.vcs.provider).to.be.equal('github')
    })

    it('vcs auth', () => {
      expect(config.vcs.auth).to.be.eql({
        password: undefined,
        readToken: '12345',
        username: undefined,
        writeToken: '54321'
      })
    })
  })
}

/**
 * Verifiy that getConfig filled in the proper Bitbucket/TeamCity config overrides
 * @param {Object} ctx - the context object for the tests
 */
function verifyBitbucketTeamcityOverrides (ctx) {
  describe('uses the right bitbucket/teamcity overrides', () => {
    let config
    beforeEach(() => {
      config = ctx.config
    })

    it('git user', () => {
      expect(config.ci.gitUser).to.be.eql({
        email: 'teamcity@domain.com',
        name: 'teamcity'
      })
    })

    it('ci provider', () => {
      expect(config.ci.provider).to.be.equal('teamcity')
    })

    it('owner', () => {
      expect(config.owner).to.be.equal('my-project')
    })

    it('repo', () => {
      expect(config.repo).to.be.equal('my-repo')
    })

    it('vcs domain', () => {
      expect(config.vcs.domain).to.be.equal('bitbucket.domain.com')
    })

    it('vcs provider', () => {
      expect(config.vcs.provider).to.be.equal('bitbucket-server')
    })

    it('vcs auth', () => {
      expect(config.vcs.auth).to.be.eql({
        password: 'teamcity12345',
        readToken: undefined,
        username: 'teamcity',
        writeToken: undefined
      })
    })
  })
}

describe('utils', () => {
  let sandbox

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    sandbox.stub(logger, 'log')
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('.getConfig()', () => {
    let config, env, realEnv

    beforeEach(() => {
      realEnv = {}
    })

    afterEach(() => {
      // restore the realEnv
      setEnv(realEnv)
    })

    describe('GitHub/Travis (default case)', () => {
      let ctx = {}
      beforeEach(() => {
        env = {
          'TRAVIS_BUILD_NUMBER': '123',
          'TRAVIS_REPO_SLUG': 'jdoe/john-and-jane',
          'RO_GH_TOKEN': '12345',
          'GITHUB_TOKEN': '54321'
        }
      })

      describe('when doing a pull request build', () => {
        beforeEach(() => {
          env.TRAVIS_PULL_REQUEST = '13'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          config = utils.getConfig()
          ctx.config = config
        })

        verifyGitHubTravisDefaults(ctx)

        it('sets isPr to true', () => {
          expect(config.isPr).to.be.true
        })

        it('sets prNumber to the PR number', () => {
          expect(config.prNumber).to.be.equal('13')
        })
      })

      describe('when doing a merge build', () => {
        beforeEach(() => {
          env.TRAVIS_PULL_REQUEST = 'false'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          config = utils.getConfig()
        })

        verifyGitHubTravisDefaults(ctx)

        it('sets isPr to false', () => {
          expect(config.isPr).to.be.false
        })

        it('sets prNumber to false', () => {
          expect(config.prNumber).to.be.equal('false')
        })
      })
    })

    describe('Bitbucket/TeamCity', () => {
      let ctx = {}
      let _config

      beforeEach(() => {
        env = {
          'TEAMCITY_BUILD_NUMBER': '123',
          'VCS_USERNAME': 'teamcity',
          'VCS_PASSWORD': 'teamcity12345'
        }

        // fake what comes from .pr-bumper.json
        _config = {
          ci: {
            env: {
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

      describe('when doing a pull request build', () => {
        beforeEach(() => {
          env.TEAMCITY_PULL_REQUEST = '13'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          config = utils.getConfig(_config)
          ctx.config = config
        })

        verifyBitbucketTeamcityOverrides(ctx)

        it('sets isPr to true', () => {
          expect(config.isPr).to.be.true
        })

        it('sets prNumber to the PR number', () => {
          expect(config.prNumber).to.be.equal('13')
        })
      })

      describe('when doing a merge build', () => {
        beforeEach(() => {
          env.TEAMCITY_PULL_REQUEST = 'false'

          saveEnv(Object.keys(env), realEnv)
          setEnv(env)

          config = utils.getConfig(_config)
        })

        verifyBitbucketTeamcityOverrides(ctx)

        it('sets isPr to false', () => {
          expect(config.isPr).to.be.false
        })

        it('sets prNumber to false', () => {
          expect(config.prNumber).to.be.equal('false')
        })
      })
    })
  })

  describe('.getValidatedScope()', () => {
    const prUrl = 'my-pr-url'
    const prNum = '12345'
    const scopes = {
      fix: 'patch',
      patch: 'patch',
      feature: 'minor',
      minor: 'minor',
      breaking: 'major',
      major: 'major'
    }

    __.forIn(scopes, (value, key) => {
      it(`handles ${key}`, () => {
        expect(utils.getValidatedScope(key, prNum, prUrl)).to.be.equal(value)
      })
    })

    it('throws on invalid scope', () => {
      const fn = () => {
        utils.getValidatedScope('foo-bar', prNum, prUrl)
      }

      expect(fn).to.throw('Invalid version-bump scope [foo-bar] found for PR #12345 (my-pr-url)')
    })
  })

  describe('.getScopeForPr()', () => {
    let pr, scope
    beforeEach(() => {
      pr = {
        description: '',
        number: '12345',
        url: 'my-pr-url'
      }
      sandbox.stub(utils, 'getValidatedScope').returns('the-validated-scope')
    })

    describe('when no version-bump present', () => {
      beforeEach(() => {
        pr.description = 'My super-cool new feature'
      })

      it('throws an error', () => {
        const fn = () => {
          utils.getScopeForPr(pr)
        }

        expect(fn).to.throw('No version-bump scope found for PR #12345 (my-pr-url)')
      })
    })

    describe('when multiple version-bumps are present', () => {
      beforeEach(() => {
        pr.description = 'This is my cool #feature# or is it a #fix#?'
      })

      it('throws an error', () => {
        const fn = () => {
          utils.getScopeForPr(pr)
        }

        expect(fn).to.throw('Too many version-bump scopes found for PR #12345 (my-pr-url)')
      })
    })

    describe('when a single version-bump is present', () => {
      beforeEach(() => {
        pr.description = 'This is my super-cool #feature#'
        scope = utils.getScopeForPr(pr)
      })

      it('calls .getValidatedScope() with proper arguments', () => {
        expect(utils.getValidatedScope.lastCall.args).to.be.eql(['feature', '12345', 'my-pr-url'])
      })

      it('returns the result of .getValidatedScope()', () => {
        expect(scope).to.be.equal('the-validated-scope')
      })
    })

    describe('when GFM checkbox syntax is present with one scope checked', () => {
      beforeEach(() => {
        pr.description = `
### Check the scope of this pr:
- [ ] #patch# - bugfix, dependency update
- [x] #minor# - new feature, backwards compatible
- [ ] #major# - major feature, probably breaking API
- [ ] #breaking# - any change that breaks the API`
        scope = utils.getScopeForPr(pr)
      })

      it('calls .getValidatedScope() with proper arguments', () => {
        expect(utils.getValidatedScope.lastCall.args).to.be.eql(['minor', '12345', 'my-pr-url'])
      })
    })

    describe('when GFM checkbox syntax is present with multiple scopes checked', () => {
      beforeEach(() => {
        pr.description = `
### Check the scope of this pr:
- [x] #patch# - bugfix, dependency update
- [ ] #minor# - new feature, backwards compatible
- [x] #major# - major feature, probably breaking API
- [ ] #breaking# - any change that breaks the API`
      })

      it('throws an error', () => {
        const fn = () => {
          utils.getScopeForPr(pr)
        }

        expect(fn).to.throw('Too many version-bump scopes found for PR #12345 (my-pr-url)')
      })
    })

    describe('when GFM checkbox syntax is present with one scope checked and other scopes mentioned', () => {
      beforeEach(() => {
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

      it('calls .getValidatedScope() with proper arguments', () => {
        expect(utils.getValidatedScope.lastCall.args).to.be.eql(['minor', '12345', 'my-pr-url'])
      })
    })
  })

  describe('.getChangelogForPr()', () => {
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
        changelog = utils.getChangelogForPr(pr)
      })

      it('uses default message', () => {
        expect(changelog).to.be.eql('No CHANGELOG section found in Pull Request description.\n' +
          'Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`')
      })
    })

    describe('when multiple changelog sections are present', () => {
      beforeEach(() => {
        pr.description = '#CHANGELOG\n## Fixes\nFoo, Bar, Baz\n#changelog\n## Features\nFizz, Bang'
        changelog = utils.getChangelogForPr(pr)
      })

      it('uses default message with error message', () => {
        expect(changelog).to.be.eql('No CHANGELOG section found in Pull Request description.\n' +
          'Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`\n' +
          'Multiple changelog sections found. Line 1 and line 4.')
      })
    })

    describe('when changelog section is present', () => {
      beforeEach(() => {
        pr.description = '#changelog\r\n## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang'
        changelog = utils.getChangelogForPr(pr)
      })

      it('grabs the changelog text', () => {
        expect(changelog).to.be.eql('## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang')
      })
    })

    describe('when changelog section has extra space at the end', () => {
      beforeEach(() => {
        pr.description = '# CHANGELOG    \n## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang'
        changelog = utils.getChangelogForPr(pr)
      })

      it('grabs the changelog text', () => {
        expect(changelog).to.be.eql('## Fixes\nFoo, Bar, Baz\n## Features\nFizz, Bang')
      })
    })
  })
})
