'use strict'

const __ = require('lodash')
const path = require('path')
const Promise = require('promise')
const cpExec = require('child_process').exec
const rewire = require('rewire')
const expect = require('chai').expect
const sinon = require('sinon')

const logger = require('../lib/logger')
const utils = rewire('../lib/utils')

const exec = Promise.denodeify(cpExec)
const getVersionCmd = `node -e "console.log(require('./_package.json').version)"`

/**
 * Wait until the promise is either resolved or rejected and then call done
 * @param {Promise} promise - the promise to wait for
 * @param {Function} done - the done function to call after resolution/rejection
 */
function waitForPromise (promise, done) {
  promise
    .then(() => {
      done()
    })
    .catch(() => {
      done()
    })
}

describe('utils', () => {
  let sandbox, execStub, revertExecRewire
  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    sandbox.stub(logger, 'log')

    // stub out the top-level 'exec'
    execStub = sandbox.stub()
    revertExecRewire = utils.__set__('exec', execStub)
  })

  afterEach(() => {
    sandbox.restore()
    revertExecRewire()
  })

  describe('.getOptions()', () => {
    let options
    describe('with .pr-bumper.json missing', () => {
      beforeEach(() => {
        options = utils.getOptions()
      })

      it('uses the correct defaults', () => {
        expect(options).to.be.eql({
          repoSlugEnv: 'TRAVIS_REPO_SLUG',
          prEnv: 'TRAVIS_PULL_REQUEST',
          buildNumberEnv: 'TRAVIS_BUILD_NUMBER'
        })
      })
    })

    describe('with .pr-bumper.json present', () => {
      beforeEach(() => {
        let original = path.join(__dirname, '.pr-bumper.json')
        return exec(`cp ${original} .pr-bumper.json`)
          .then(() => {
            options = utils.getOptions()
          })
      })

      afterEach(() => {
        return exec(`rm -f .pr-bumper.json`)
      })

      it('uses the options from the config file', () => {
        expect(options).to.be.eql({
          repoSlugEnv: 'REPO_SLUG',
          prEnv: 'PR_NUMBER',
          buildNumberEnv: 'BUILD_NUMBER'
        })
      })
    })
  })

  describe('.getConfig()', () => {
    let config
    beforeEach(() => {
      sandbox.stub(utils, 'getOptions')
      process.env.MY_REPO_SLUG = 'jdoe/john-and-jane'
      process.env.MY_PULL_REQUEST = 'false'
      process.env.MY_BUILD_NUMBER = '12345'
    })

    describe('when options are given which include owner/repo', () => {
      let options
      beforeEach(() => {
        options = {
          owner: 'me',
          repo: 'my-repo',
          repoSlugEnv: 'MY_REPO_SLUG',
          prEnv: 'MY_PULL_REQUEST',
          buildNumberEnv: 'MY_BUILD_NUMBER'
        }

        config = utils.getConfig(options)
      })

      it('does not call getOptions()', () => {
        expect(utils.getOptions.called).to.be.false
      })

      it('creates the proper config', () => {
        expect(config).to.be.eql({
          owner: 'me',
          repo: 'my-repo',
          isPr: false,
          prNumber: 'false',
          buildNumber: '12345'
        })
      })
    })

    describe('when options are calculated and lack owner/repo', () => {
      beforeEach(() => {
        utils.getOptions.returns({
          repoSlugEnv: 'MY_REPO_SLUG',
          prEnv: 'MY_PULL_REQUEST',
          buildNumberEnv: 'MY_BUILD_NUMBER'
        })
        process.env.MY_PULL_REQUEST = '13'
        config = utils.getConfig()
      })

      it('calls getOptions()', () => {
        expect(utils.getOptions.calledOnce).to.be.ok
      })

      it('returns the proper config', () => {
        expect(config).to.be.eql({
          owner: 'jdoe',
          repo: 'john-and-jane',
          isPr: true,
          prNumber: '13',
          buildNumber: '12345'
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

  describe('.getSha()', () => {
    let config, vcs, resolution, rejection
    beforeEach(() => {
      config = {prNumber: '12345'}
      vcs = {getPr: function () {}}
    })

    describe('when everything works', () => {
      beforeEach(() => {
        sandbox.stub(vcs, 'getPr').returns(Promise.resolve({mergeCommitSha: 'my-sha'}))
        return utils.getSha(config, vcs)
          .then((res) => {
            resolution = res
          })
          .catch((err) => {
            rejection = err
          })
      })

      it('calls getPr with the correct PR number', () => {
        expect(vcs.getPr.lastCall.args).to.be.eql(['12345'])
      })

      it('resolves with sha', () => {
        expect(resolution).to.be.equal('my-sha')
      })
    })

    describe('when getPr fails', () => {
      beforeEach(() => {
        sandbox.stub(vcs, 'getPr').returns(Promise.reject('my-error'))
        return utils.getSha(config, vcs)
          .then((res) => {
            resolution = res
          })
          .catch((err) => {
            rejection = err
          })
      })

      it('passes up the rejection', () => {
        expect(rejection).to.be.equal('my-error')
      })
    })
  })

  describe('.getLastPr()', () => {
    let config, vcs, getPrResolver, resolution, rejection, promise
    beforeEach(() => {
      config = {}
      vcs = {getPr: function () {}}
      sandbox.stub(vcs, 'getPr')
      getPrResolver = {}
      const getPrPromise = new Promise((resolve, reject) => {
        getPrResolver.resolve = resolve
        getPrResolver.reject = reject
      })
      vcs.getPr.returns(getPrPromise)

      // actual results of git log -10 --oneline on pr-bumper repo
      const gitLog =
        '98a148c Added some more tests, just a few more to go\n' +
        '1b1bd97 Added some real unit tests\n' +
        'edf85e0 Merge pull request #30 from job13er/remove-newline\n' +
        'fa066f2 Removed newline from parsed PR number\n' +
        'fc416cc Merge pull request #29 from job13er/make-bumping-more-robust\n' +
        '67db358 Fix for #26 by reading PR # from git commit\n' +
        '4a61a20 Automated version bump [ci skip]\n' +
        '7db44e1 Merge pull request #24 from sandersky/master\n' +
        'f571451 add pullapprove config\n' +
        '4398a26 address PR concerns\n'

      execStub.returns(Promise.resolve(gitLog))
      promise = utils.getLastPr(config, vcs)
        .then((pr) => {
          resolution = pr
          return pr
        })
        .catch((err) => {
          rejection = err
          throw err
        })
    })

    it('calls git log', () => {
      expect(execStub.lastCall.args).to.be.eql(['git log -10 --oneline'])
    })

    describe('when getPr succeeds', () => {
      beforeEach((done) => {
        waitForPromise(promise, done)
        getPrResolver.resolve('the-pr')
      })

      it('parses out the PR number from the git log and passes it to vcs.getPr()', () => {
        expect(vcs.getPr.lastCall.args).to.be.eql(['30'])
      })

      it('resolves with the pr', () => {
        expect(resolution).to.be.equal('the-pr')
      })
    })

    describe('when getPr fails', () => {
      beforeEach((done) => {
        waitForPromise(promise, done)
        getPrResolver.reject('the-error')
      })

      it('parses out the PR number from the git log and passes it to vcs.getPr()', () => {
        expect(vcs.getPr.lastCall.args).to.be.eql(['30'])
      })

      it('rejects with the error', () => {
        expect(rejection).to.be.equal('the-error')
      })
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
  })

  describe('.bumpVersion()', () => {
    let newVersion, logStub
    beforeEach(() => {
      let original = path.join(__dirname, '_package.json')
      return exec(`cp ${original} _package.json`)
    })

    afterEach(() => {
      return exec(`rm -f _package.json`)
    })

    describe('a fix', () => {
      beforeEach(() => {
        logStub = sinon.stub(console, 'log')
        utils.bumpVersion('patch', '_package.json')
        logStub.restore()
        return exec(`${getVersionCmd}`)
          .then((stdout) => {
            newVersion = stdout.replace('\n', '')
          })
      })

      it('creates the correct version', () => {
        expect(newVersion).to.be.equal('1.2.4')
      })
    })

    describe('a feature', () => {
      beforeEach(() => {
        logStub = sinon.stub(console, 'log')
        utils.bumpVersion('minor', '_package.json')
        logStub.restore()
        return exec(`${getVersionCmd}`)
          .then((stdout) => {
            newVersion = stdout.replace('\n', '')
          })
      })

      it('creates the correct version', () => {
        expect(newVersion).to.be.equal('1.3.0')
      })
    })

    describe('a beaking change', () => {
      beforeEach(() => {
        logStub = sinon.stub(console, 'log')
        utils.bumpVersion('major', '_package.json')
        logStub.restore()
        return exec(`${getVersionCmd}`)
          .then((stdout) => {
            newVersion = stdout.replace('\n', '')
          })
      })

      it('creates the correct version', () => {
        expect(newVersion).to.be.equal('2.0.0')
      })
    })

    describe('an invalid scope', () => {
      it('throws an Error', () => {
        const fn = () => {
          utils.bumpVersion('foo', '_package.json')
        }
        expect(fn).to.throw('bumpVersion: Invalid scope [foo]')
      })
    })
  })

  describe('.commitChanges()', () => {
    let config
    beforeEach(() => {
      config = {buildNumber: '13'}

      // we want exec() to return a simple resolved Promise most of the time, but when it gets the node call
      // it needs to return a version number
      execStub.withArgs(`node -e "console.log(require('./package.json').version)"`).returns(Promise.resolve('1.2.3\n'))
      execStub.returns(Promise.resolve())

      return utils.commitChanges(config)
    })

    it('sets the git user.email first', () => {
      expect(execStub.firstCall.args).to.be.eql(['git config --global user.email "travis.ci.ciena@gmail.com"'])
    })

    it('sets the git user.name second', () => {
      expect(execStub.secondCall.args).to.be.eql(['git config --global user.name "Travis CI"'])
    })

    it('checks out a new branch third', () => {
      expect(execStub.thirdCall.args).to.be.eql(['git checkout -b my-master'])
    })

    it('adds the package.json fourth', () => {
      expect(execStub.getCall(3).args).to.be.eql(['git add package.json'])
    })

    it('makes the commit fifth', () => {
      expect(execStub.getCall(4).args).to.be.eql([
        'git commit -m "Automated version bump [ci skip]" -m "From CI build 13"'
      ])
    })

    it('fetches the new version sixth', () => {
      expect(execStub.getCall(5).args).to.be.eql([`node -e "console.log(require('./package.json').version)"`])
    })

    it('creates the tag seventh', () => {
      expect(execStub.getCall(6).args).to.be.eql(['git tag v1.2.3 -a -m "Generated tag from CI build 13"'])
    })
  })
})
