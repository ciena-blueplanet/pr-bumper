'use strict'

const __ = require('lodash')
const expect = require('chai').expect
const path = require('path')
const Promise = require('promise')
const sinon = require('sinon')
const cpExec = require('child_process').exec
const rewire = require('rewire')

const utils = require('../lib/utils')
const logger = require('../lib/logger')
const Bumper = rewire('../lib/bumper')

const exec = Promise.denodeify(cpExec)
const getVersionCmd = 'node -e "console.log(require(\'./_package.json\').version)"'
const realGetVersionCmd = 'node -e "console.log(require(\'./package.json\').version)"'

/**
 * Helper for performing repetative tasks in setting up _bumpVersion tests
 * Since versiony doesn't let you tell it to be quiet, we need to stub out
 * console.log() but only while _bumpVersion runs, or we won't get mocha output
 * while running our tests
 *
 * @param {Object} ctx - the context object so the function can pass some info back to the tests for validation
 * @param {String} scope - the scope to bump
 * @param {String} expectedVersion - the expected version after the bump
 */
function testBumpVersion (ctx, scope, expectedVersion) {
  describe(`a ${scope}`, () => {
    let bumper, logStub, info, newVersion
    beforeEach(() => {
      bumper = ctx.bumper

      logStub = sinon.stub(console, 'log')
      info = bumper._bumpVersion({scope}, '_package.json')
      logStub.restore()

      return exec(`${getVersionCmd}`)
        .then((stdout) => {
          newVersion = stdout.replace('\n', '')
        })
    })

    it('creates the correct version', () => {
      expect(newVersion).to.be.equal(expectedVersion)
    })

    it('returns the correct version', () => {
      expect(info.version).to.be.equal(expectedVersion)
    })
  })
}

describe('Bumper', () => {
  let bumper, sandbox, execStub, revertExecRewire, prependStub, revertPrepend
  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    sandbox.stub(logger, 'log')

    // stub out the top-level 'exec'
    execStub = sandbox.stub()
    revertExecRewire = Bumper.__set__('exec', execStub)

    // stub out the top-level 'prepend'
    prependStub = sandbox.stub()
    revertPrepend = Bumper.__set__('prepend', prependStub)

    bumper = new Bumper({
      ci: [],
      config: {},
      vcs: {}
    })
  })

  afterEach(() => {
    sandbox.restore()
    revertExecRewire()
    revertPrepend()
  })

  describe('.check()', () => {
    beforeEach(() => {
      sandbox.stub(bumper, '_getOpenPrScope').returns(Promise.resolve('minor'))
    })

    describe('when not a PR build', () => {
      beforeEach(() => {
        return bumper.check()
      })

      it('notifies user that it is skipping the check', () => {
        expect(logger.log.lastCall.args).to.eql(['pr-bumper: Not a PR build, skipping check'])
      })

      it('does not look for open pr scope', () => {
        expect(bumper._getOpenPrScope.called).to.be.false
      })
    })

    describe('when it is a PR build', () => {
      beforeEach(() => {
        bumper.config.isPr = true
        return bumper.check()
      })

      it('looks for open pr scope', () => {
        expect(bumper._getOpenPrScope.calledOnce).to.be.true
      })

      it('notifies user of the scope it found', () => {
        expect(logger.log.lastCall.args).to.eql(['Found a minor bump for the current PR'])
      })
    })
  })

  describe('.bump()', () => {
    let result, info
    beforeEach(() => {
      bumper.config = {foo: 'bar', prependChangelog: true}
      bumper.vcs = {foo: 'bar'}
      bumper.ci = {push: function () {}}
      info = {scope: 'minor', changelog: '', version: '1.2.0'}
      sandbox.stub(bumper.ci, 'push').returns(Promise.resolve('pushed'))
      sandbox.stub(bumper, '_getMergedPrInfo').returns(Promise.resolve(info))
      sandbox.stub(bumper, '_bumpVersion').returns(Promise.resolve(info))
      sandbox.stub(bumper, '_prependChangelog').returns(Promise.resolve())
      sandbox.stub(bumper, '_commitChanges').returns(Promise.resolve())
      sandbox.stub(bumper, '_createTag').returns(Promise.resolve())
      sandbox.stub(bumper, '_dependencies').returns(Promise.resolve())

      return bumper.bump().then((res) => {
        result = res
      })
    })

    it('gets the merged pr info', () => {
      expect(bumper._getMergedPrInfo.calledOnce).to.be.ok
    })

    it('bumps the version', () => {
      expect(bumper._bumpVersion.lastCall.args).to.eql([info, 'package.json'])
    })

    it('prepends the changelog', () => {
      expect(bumper._prependChangelog.lastCall.args).to.eql([info, 'CHANGELOG.md'])
    })

    it('commits the change', () => {
      expect(bumper._commitChanges.calledOnce).to.be.ok
    })

    it('creates the tag', () => {
      expect(bumper._createTag.calledOnce).to.be.ok
    })

    it('runs the dependencies', () => {
      expect(bumper._dependencies.calledOnce).to.be.ok
    })

    it('pushs the changes', () => {
      expect(bumper.ci.push.lastCall.args).to.be.eql([bumper.vcs])
    })

    it('resolves with the result of the ci.push()', () => {
      expect(result).to.be.eql('pushed')
    })

    describe('skip bump when not a merge build', () => {
      beforeEach(() => {
        bumper.config.isPr = true
        bumper._getMergedPrInfo.reset()
        return bumper.bump()
      })

      it('should log that non merge builds are skipped', () => {
        expect(logger.log.lastCall.args).to.eql(['pr-bumper: Not a merge build, skipping bump'])
        expect(bumper._getMergedPrInfo.callCount).to.eql(0)
      })
    })
  })

  describe('._bumpVersion()', () => {
    let ctx = {}
    beforeEach(() => {
      ctx.bumper = bumper

      let original = path.join(__dirname, '_package.json')
      return exec(`cp ${original} _package.json`)
    })

    afterEach(() => {
      return exec('rm -f _package.json')
    })

    testBumpVersion(ctx, 'patch', '1.2.4')
    testBumpVersion(ctx, 'minor', '1.3.0')
    testBumpVersion(ctx, 'major', '2.0.0')

    describe('an invalid scope', () => {
      it('throws an Error', () => {
        const fn = () => {
          bumper._bumpVersion({scope: 'foo'}, '_package.json')
        }
        expect(fn).to.throw('pr-bumper: Invalid scope [foo]')
      })
    })
  })

  describe('._commitChanges()', () => {
    let result
    beforeEach(() => {
      __.set(bumper.config, 'ci.buildNumber', '12345')
      __.set(bumper.config, 'dependencies.output.directory', 'some-dir')

      bumper.ci = {
        add () {},
        commit () {},
        setupGitEnv () {}
      }

      sandbox.stub(bumper.ci, 'add').returns(Promise.resolve('added'))
      sandbox.stub(bumper.ci, 'commit').returns(Promise.resolve('committed'))
      sandbox.stub(bumper.ci, 'setupGitEnv').returns(Promise.resolve('set-up'))

      return bumper._commitChanges().then((res) => {
        result = res
      })
    })

    it('sets up git env', () => {
      expect(bumper.ci.setupGitEnv.calledOnce).to.be.ok
    })

    it('adds the files to stage', () => {
      expect(bumper.ci.add.lastCall.args).to.be.eql([['package.json', 'CHANGELOG.md', 'some-dir/']])
    })

    it('commits the changes', () => {
      const summary = 'Automated version bump [ci skip]'
      const message = 'From CI build 12345'

      expect(bumper.ci.commit.lastCall.args).to.be.eql([summary, message])
    })

    it('resolves with the result of the commit', () => {
      expect(result).to.be.equal('committed')
    })
  })

  describe('._createTag()', () => {
    let result

    beforeEach(() => {
      __.set(bumper.config, 'ci.buildNumber', '12345')
      bumper.ci = {
        tag () {}
      }

      sandbox.stub(bumper.ci, 'tag').returns(Promise.resolve('tagged'))

      // we want exec() to return a simple resolved Promise most of the time, but when it gets the node call
      // it needs to return a version number
      execStub.withArgs(realGetVersionCmd).returns(Promise.resolve('1.2.3\n'))
      execStub.returns(Promise.resolve())

      return bumper._createTag().then((res) => {
        result = res
      })
    })

    it('gets the version', () => {
      expect(execStub.lastCall.args).to.be.eql([realGetVersionCmd])
    })

    it('creates a tag', () => {
      expect(bumper.ci.tag.lastCall.args).to.be.eql(['v1.2.3', 'Generated tag from CI build 12345'])
    })

    it('resolves with the result of the tag', () => {
      expect(result).to.be.equal('tagged')
    })
  })

  describe('._dependencies()', () => {
    it('returns a promise resolving to nothing when an out dir is configured', function (done) {
      const outputConfig = {
        directory: 'blackduck/',
        requirementsFile: 'js-requirements.json',
        reposFile: 'repos',
        ignoreFile: 'ignore'
      }
      __.set(bumper.config, 'dependencies.output', outputConfig)
      bumper._dependencies().then((result) => {
        expect(result).to.equal(undefined)
        done()
      })
    })

    it('returns a promise resolving to \'skipping dependencies\' if no dir is configured', function (done) {
      bumper._dependencies().then((result) => {
        expect(result).to.equal('skipping dependencies')
        done()
      })
    })
  })

  describe('._getLastPr()', () => {
    let getPrResolver, resolution, rejection, promise
    beforeEach(() => {
      bumper.vcs = {getPr: function () {}}

      getPrResolver = {}
      const getPrPromise = new Promise((resolve, reject) => {
        getPrResolver.resolve = resolve
        getPrResolver.reject = reject
      })

      sandbox.stub(bumper.vcs, 'getPr').returns(getPrPromise)

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
      promise = bumper._getLastPr()
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
      beforeEach(() => {
        getPrResolver.resolve('the-pr')
        return promise
      })

      it('parses out the PR number from the git log and passes it to vcs.getPr()', () => {
        expect(bumper.vcs.getPr.lastCall.args).to.be.eql(['30'])
      })

      it('resolves with the pr', () => {
        expect(resolution).to.be.equal('the-pr')
      })
    })

    describe('when getPr fails', () => {
      beforeEach((done) => {
        getPrResolver.reject('the-error')
        promise.catch(() => {
          done()
        })
      })

      it('parses out the PR number from the git log and passes it to vcs.getPr()', () => {
        expect(bumper.vcs.getPr.lastCall.args).to.be.eql(['30'])
      })

      it('rejects with the error', () => {
        expect(rejection).to.be.equal('the-error')
      })
    })
  })

  describe('._getMergedPrInfo()', () => {
    let result
    beforeEach(() => {
      bumper.config = {foo: 'bar'}
      bumper.vcs = {bar: 'baz'}

      sandbox.stub(bumper, '_getLastPr').returns(Promise.resolve('the-pr'))
      sandbox.stub(utils, 'getScopeForPr').returns('major')
      sandbox.stub(utils, 'getChangelogForPr').returns('my-changelog')

      return bumper._getMergedPrInfo().then((res) => {
        result = res
      })
    })

    it('gets the last PR to be merged', () => {
      expect(bumper._getLastPr.calledOnce).to.be.ok
    })

    it('gets the scope for the given pr', () => {
      expect(utils.getScopeForPr.lastCall.args).to.be.eql(['the-pr'])
    })

    it('gets the changelog for the given pr', () => {
      expect(utils.getChangelogForPr.lastCall.args).to.be.eql(['the-pr'])
    })

    it('resolves with the info', () => {
      expect(result).to.be.eql({changelog: 'my-changelog', scope: 'major'})
    })
  })

  describe('._getOpenPrScope()', () => {
    let result
    beforeEach(() => {
      bumper.config = {foo: 'bar', prNumber: '123'}
      bumper.vcs = {getPr: function () {}}

      sandbox.stub(bumper.vcs, 'getPr').returns(Promise.resolve('the-pr'))
      sandbox.stub(utils, 'getScopeForPr').returns(Promise.resolve('patch'))

      return bumper._getOpenPrScope().then((res) => {
        result = res
      })
    })

    it('fetches the PR', () => {
      expect(bumper.vcs.getPr.lastCall.args).to.be.eql(['123'])
    })

    it('gets the scope for the given pr', () => {
      expect(utils.getScopeForPr.lastCall.args).to.be.eql(['the-pr'])
    })

    it('resolves with the scope', () => {
      expect(result).to.be.eql('patch')
    })
  })

  describe('._prependChangelog()', () => {
    let changelogContent = '- Example change'
    let info = {scope: 'minor', changelog: changelogContent, version: '1.2.0'}
    beforeEach(() => {
      sandbox.stub(bumper, '_bumpVersion').returns(Promise.resolve(info))
      sandbox.stub(bumper, '_getMergedPrInfo').returns(Promise.resolve(info))
      sandbox.stub(bumper, '_commitChanges').returns(Promise.resolve())
      sandbox.stub(bumper, '_createTag').returns(Promise.resolve())
      prependStub.withArgs('CHANGELOG.md', changelogContent).returns(Promise.resolve())

      bumper.config.prependChangelog = true
      return bumper.bump()
    })

    it('does nothing', function () {
      expect(1).to.eql(1)
    })

    describe('configuration on', () => {
      beforeEach(() => {
        bumper.config.prependChangelog = true
        return bumper.bump()
      })

      it('prepends to the CHANGELOG.md', () => {
        expect(prependStub.lastCall.args).to.be.eql(['CHANGELOG.md', `# 1.2.0\n${info.changelog}\n\n`])
      })
    })

    describe('configuration off', () => {
      beforeEach(() => {
        prependStub.reset()
        bumper.config.prependChangelog = false
        return bumper.bump()
      })

      it('does not prepend to the CHANGELOG.md', () => {
        expect(prependStub.called).to.be.false
      })
    })
  })
})
