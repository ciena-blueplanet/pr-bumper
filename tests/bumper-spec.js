'use strict'

const chai = require('chai')
const cpExec = require('child_process').exec
const __ = require('lodash')
const path = require('path')
const Promise = require('promise')
const rewire = require('rewire')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const expect = chai.expect
chai.use(sinonChai)

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
  describe(`a ${scope}`, function () {
    let bumper, logStub, info, newVersion
    beforeEach(function () {
      bumper = ctx.bumper

      logStub = sinon.stub(console, 'log')
      info = bumper._bumpVersion({scope}, '_package.json')
      logStub.restore()

      return exec(`${getVersionCmd}`)
        .then((stdout) => {
          newVersion = stdout.replace('\n', '')
        })
    })

    it('should create the correct version', function () {
      expect(newVersion).to.be.equal(expectedVersion)
    })

    if (scope === 'none') {
      it('should not include the version', function () {
        expect(info.version).to.equal(undefined)
      })
    } else {
      it('should return the correct version', function () {
        expect(info.version).to.be.equal(expectedVersion)
      })
    }
  })
}

describe('Bumper', function () {
  let bumper, sandbox, execStub, revertExecRewire, prependStub, revertPrepend, depStub, revertDeps

  beforeEach(function () {
    sandbox = sinon.sandbox.create()
    sandbox.stub(logger, 'log')

    // stub out the top-level 'exec'
    execStub = sandbox.stub()
    revertExecRewire = Bumper.__set__('exec', execStub)

    // stub out the top-level 'prepend'
    prependStub = sandbox.stub()
    revertPrepend = Bumper.__set__('prepend', prependStub)

    // stub out dependency reporter
    depStub = {
      run: sandbox.stub().returns(Promise.resolve())
    }
    revertDeps = Bumper.__set__('dependencies', depStub)

    bumper = new Bumper({
      ci: [],
      config: {},
      vcs: {}
    })
  })

  afterEach(function () {
    sandbox.restore()
    revertExecRewire()
    revertPrepend()
    revertDeps()
  })

  describe('.check()', function () {
    beforeEach(function () {
      sandbox.stub(bumper, '_getOpenPrInfo').returns(Promise.resolve({scope: 'minor'}))
    })

    describe('when not a PR build', function () {
      beforeEach(function () {
        return bumper.check()
      })

      it('should notify user that it is skipping the check', function () {
        expect(logger.log).to.have.been.calledWith('pr-bumper: Not a PR build, skipping check')
      })

      it('should not look for open pr info', function () {
        expect(bumper._getOpenPrInfo).to.have.callCount(0)
      })
    })

    describe('when it is a PR build', function () {
      beforeEach(function () {
        bumper.config.isPr = true
        return bumper.check()
      })

      it('should look for open pr info', function () {
        expect(bumper._getOpenPrInfo).to.have.callCount(1)
      })

      it('should notify user of the scope it found', function () {
        expect(logger.log).to.have.been.calledWith('Found a minor bump for the current PR')
      })
    })
  })

  describe('.bump()', function () {
    let result, info, error

    beforeEach(function () {
      result = null
      error = null
      bumper.config = {foo: 'bar', prependChangelog: true, dependencySnapshotFile: 'snapshot-file'}
      bumper.vcs = {foo: 'bar'}
      bumper.ci = {push () {}, getLastCommitMsg () {}}
      info = {scope: 'minor', changelog: '', version: '1.2.0'}
      sandbox.stub(bumper.ci, 'push').returns(Promise.resolve('pushed'))
      sandbox.stub(bumper.ci, 'getLastCommitMsg')
      sandbox.stub(bumper, '_getMergedPrInfo').returns(Promise.resolve(info))
      sandbox.stub(bumper, '_bumpVersion').returns(Promise.resolve(info))
      sandbox.stub(bumper, '_prependChangelog').returns(Promise.resolve())
      sandbox.stub(bumper, '_generateDependencySnapshot').returns(Promise.resolve())
      sandbox.stub(bumper, '_commitChanges').returns(Promise.resolve())
      sandbox.stub(bumper, '_createTag').returns(Promise.resolve())
      sandbox.stub(bumper, '_dependencies').returns(Promise.resolve())
    })

    describe('when a merge build', function () {
      beforeEach(function (done) {
        bumper.ci.getLastCommitMsg.returns(Promise.resolve('foo bar'))
        bumper.bump()
          .then((res) => {
            result = res
          })
          .catch((err) => {
            error = err
          })
          .finally(() => {
            done()
          })
      })

      it('should get the merged pr info', function () {
        expect(bumper._getMergedPrInfo).to.have.callCount(1)
      })

      it('should bump the version', function () {
        expect(bumper._bumpVersion).to.have.been.calledWith(info, 'package.json')
      })

      it('should prepend the changelog', function () {
        expect(bumper._prependChangelog).to.have.been.calledWith(info, 'CHANGELOG.md')
      })

      it('should generate the dependency snapshot', function () {
        expect(bumper._generateDependencySnapshot).to.have.callCount(1)
      })

      it('should commit the change', function () {
        expect(bumper._commitChanges).to.have.callCount(1)
      })

      it('should create the tag', function () {
        expect(bumper._createTag).to.have.callCount(1)
      })

      it('should run the dependencies', function () {
        expect(bumper._dependencies).to.have.callCount(1)
      })

      it('should push the changes', function () {
        expect(bumper.ci.push).to.have.been.calledWith(bumper.vcs)
      })

      it('should resolve with the result of the ci.push()', function () {
        expect(result).to.be.eql('pushed')
      })

      it('should not reject', function () {
        expect(error).to.equal(null)
      })
    })

    describe('when prependChangelog is false', function () {
      beforeEach(function (done) {
        bumper.ci.getLastCommitMsg.returns(Promise.resolve('foo bar'))
        bumper.config.prependChangelog = false

        bumper.bump()
          .then((res) => {
            result = res
          })
          .catch((err) => {
            error = err
          })
          .finally(() => {
            done()
          })
      })

      it('should get the merged pr info', function () {
        expect(bumper._getMergedPrInfo).to.have.callCount(1)
      })

      it('should bump the version', function () {
        expect(bumper._bumpVersion).to.have.been.calledWith(info, 'package.json')
      })

      it('should not prepend the changelog', function () {
        expect(bumper._prependChangelog).to.have.callCount(0)
      })

      it('should generate the dependency snapshot', function () {
        expect(bumper._generateDependencySnapshot).to.have.callCount(1)
      })

      it('should commit the change', function () {
        expect(bumper._commitChanges).to.have.callCount(1)
      })

      it('should create the tag', function () {
        expect(bumper._createTag).to.have.callCount(1)
      })

      it('should run the dependencies', function () {
        expect(bumper._dependencies).to.have.callCount(1)
      })

      it('should push the changes', function () {
        expect(bumper.ci.push).to.have.been.calledWith(bumper.vcs)
      })

      it('should resolve with the result of the ci.push()', function () {
        expect(result).to.be.eql('pushed')
      })

      it('should not reject', function () {
        expect(error).to.equal(null)
      })
    })

    describe('when dependencySnapshotFile is blank', function () {
      beforeEach(function (done) {
        bumper.ci.getLastCommitMsg.returns(Promise.resolve('foo bar'))
        bumper.config.dependencySnapshotFile = ''

        bumper.bump()
          .then((res) => {
            result = res
          })
          .catch((err) => {
            error = err
          })
          .finally(() => {
            done()
          })
      })

      it('should get the merged pr info', function () {
        expect(bumper._getMergedPrInfo).to.have.callCount(1)
      })

      it('should bump the version', function () {
        expect(bumper._bumpVersion).to.have.been.calledWith(info, 'package.json')
      })

      it('should prepend the changelog', function () {
        expect(bumper._prependChangelog).to.have.been.calledWith(info, 'CHANGELOG.md')
      })

      it('should not generate the dependency snapshot', function () {
        expect(bumper._generateDependencySnapshot).to.have.callCount(0)
      })

      it('should commit the change', function () {
        expect(bumper._commitChanges).to.have.callCount(1)
      })

      it('should create the tag', function () {
        expect(bumper._createTag).to.have.callCount(1)
      })

      it('should run the dependencies', function () {
        expect(bumper._dependencies).to.have.callCount(1)
      })

      it('should push the changes', function () {
        expect(bumper.ci.push).to.have.been.calledWith(bumper.vcs)
      })

      it('should resolve with the result of the ci.push()', function () {
        expect(result).to.be.eql('pushed')
      })

      it('should not reject', function () {
        expect(error).to.equal(null)
      })
    })

    describe('when last commit was automated version bump', function () {
      beforeEach(function (done) {
        bumper.ci.getLastCommitMsg.returns(Promise.resolve('Automated version bump [ci skip]'))
        bumper.bump()
          .then((res) => {
            result = res
          })
          .catch((err) => {
            error = err
          })
          .finally(() => {
            done()
          })
      })

      it('should not lookup merged PR info', function () {
        expect(bumper._getMergedPrInfo).to.have.callCount(0)
      })

      it('should not bump version', function () {
        expect(bumper._bumpVersion).to.have.callCount(0)
      })

      it('should not prepend changelog', function () {
        expect(bumper._prependChangelog).to.have.callCount(0)
      })

      it('should not generate a dependency snapshot', function () {
        expect(bumper._generateDependencySnapshot).to.have.callCount(0)
      })

      it('should not calcualte dependencies', function () {
        expect(bumper._dependencies).to.have.callCount(0)
      })

      it('should not commit changes', function () {
        expect(bumper._commitChanges).to.have.callCount(0)
      })

      it('should not create a tag', function () {
        expect(bumper._createTag).to.have.callCount(0)
      })

      it('should not push commit', function () {
        expect(bumper.ci.push).to.have.callCount(0)
      })

      it('should not resolve', function () {
        expect(result).to.equal(null)
      })

      it('should reject with a Cancel', function () {
        expect(error).to.be.instanceof(Bumper.Cancel)
      })

      it('should reject with proper message', function () {
        expect(error.message).to.equal('Skipping bump on version bump commit.')
      })
    })

    describe('when no version bump happens', function () {
      beforeEach(function (done) {
        bumper.ci.getLastCommitMsg.returns(Promise.resolve('fizz bang'))
        bumper._bumpVersion.returns(Promise.resolve({scope: 'none', changelog: ''}))
        bumper.bump()
          .then((res) => {
            result = res
          })
          .catch((err) => {
            error = err
          })
          .finally(() => {
            done()
          })
      })

      it('should lookup merged PR info', function () {
        expect(bumper._getMergedPrInfo).to.have.callCount(1)
      })

      it('should call _bumpVersion()', function () {
        expect(bumper._bumpVersion).to.have.callCount(1)
      })

      it('should not prepend changelog', function () {
        expect(bumper._prependChangelog).to.have.callCount(0)
      })

      it('should not generate a dependency snapshot', function () {
        expect(bumper._generateDependencySnapshot).to.have.callCount(0)
      })

      it('should not calcualte dependencies', function () {
        expect(bumper._dependencies).to.have.callCount(0)
      })

      it('should not commit changes', function () {
        expect(bumper._commitChanges).to.have.callCount(0)
      })

      it('should not create a tag', function () {
        expect(bumper._createTag).to.have.callCount(0)
      })

      it('should not push commit', function () {
        expect(bumper.ci.push).to.have.callCount(0)
      })

      it('should not resolve', function () {
        expect(result).to.equal(null)
      })

      it('should reject with a Cancel', function () {
        expect(error).to.be.instanceof(Bumper.Cancel)
      })

      it('should reject with proper message', function () {
        expect(error.message).to.equal('Skipping bump commit since version did not change.')
      })
    })

    describe('when not a merge build', function () {
      beforeEach(function (done) {
        bumper.config.isPr = true
        bumper._getMergedPrInfo.reset()
        bumper.bump()
          .then((res) => {
            result = res
          })
          .catch((err) => {
            error = err
          })
          .finally(() => {
            done()
          })
      })

      it('should log that non merge builds are skipped', function () {
        expect(logger.log).to.have.been.calledWith('pr-bumper: Not a merge build, skipping bump')
      })

      it('should not lookup merged PR info', function () {
        expect(bumper._getMergedPrInfo).to.have.callCount(0)
      })

      it('should not bump version', function () {
        expect(bumper._bumpVersion).to.have.callCount(0)
      })

      it('should not prepend changelog', function () {
        expect(bumper._prependChangelog).to.have.callCount(0)
      })

      it('should not generate a dependency snapshot', function () {
        expect(bumper._generateDependencySnapshot).to.have.callCount(0)
      })

      it('should not calcualte dependencies', function () {
        expect(bumper._dependencies).to.have.callCount(0)
      })

      it('should not commit changes', function () {
        expect(bumper._commitChanges).to.have.callCount(0)
      })

      it('should not create a tag', function () {
        expect(bumper._createTag).to.have.callCount(0)
      })

      it('should not push commit', function () {
        expect(bumper.ci.push).to.have.callCount(0)
      })

      it('should not reject', function () {
        expect(error).to.equal(null)
      })
    })
  })

  describe('._bumpVersion()', function () {
    const ctx = {}

    beforeEach(function () {
      ctx.bumper = bumper

      let original = path.join(__dirname, '_package.json')
      return exec(`cp ${original} _package.json`)
    })

    afterEach(function () {
      return exec('rm -f _package.json')
    })

    testBumpVersion(ctx, 'none', '1.2.3')
    testBumpVersion(ctx, 'patch', '1.2.4')
    testBumpVersion(ctx, 'minor', '1.3.0')
    testBumpVersion(ctx, 'major', '2.0.0')

    describe('an invalid scope', function () {
      let info
      beforeEach(function () {
        info = {scope: 'foo'}
      })

      it('should throw an Error', function () {
        expect(() => {
          bumper._bumpVersion(info, '_package.json')
        }).to.throw('pr-bumper: Invalid scope [foo]')
      })
    })
  })

  describe('._commitChanges()', function () {
    let result

    beforeEach(function () {
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
    })

    describe('when dependencySnapshotFile is set', function () {
      beforeEach(function () {
        bumper.config.dependencySnapshotFile = 'snapshot-file'

        return bumper._commitChanges().then((res) => {
          result = res
        })
      })

      it('should set up git env', function () {
        expect(bumper.ci.setupGitEnv).to.have.callCount(1)
      })

      it('should add the files to stage', function () {
        expect(bumper.ci.add).to.have.been.calledWith(['package.json', 'CHANGELOG.md', 'snapshot-file', 'some-dir/'])
      })

      it('should commits the changes', function () {
        const summary = 'Automated version bump [ci skip]'
        const message = 'From CI build 12345'

        expect(bumper.ci.commit).to.have.been.calledWith(summary, message)
      })

      it('should resolve with the result of the commit', function () {
        expect(result).to.be.equal('committed')
      })
    })

    describe('when dependencySnapshotFile is not set', function () {
      beforeEach(function () {
        bumper.config.dependencySnapshotFile = ''

        return bumper._commitChanges().then((res) => {
          result = res
        })
      })

      it('should set up git env', function () {
        expect(bumper.ci.setupGitEnv).to.have.callCount(1)
      })

      it('should add the files to stage', function () {
        expect(bumper.ci.add).to.have.been.calledWith(['package.json', 'CHANGELOG.md', 'some-dir/'])
      })

      it('should commits the changes', function () {
        const summary = 'Automated version bump [ci skip]'
        const message = 'From CI build 12345'

        expect(bumper.ci.commit).to.have.been.calledWith(summary, message)
      })

      it('should resolve with the result of the commit', function () {
        expect(result).to.be.equal('committed')
      })
    })
  })

  describe('._createTag()', function () {
    let result

    beforeEach(function () {
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

    it('should get the version', function () {
      expect(execStub).to.have.been.calledWith(realGetVersionCmd)
    })

    it('should create a tag', function () {
      expect(bumper.ci.tag).to.have.been.calledWith('v1.2.3', 'Generated tag from CI build 12345')
    })

    it('should resolve with the result of the tag', function () {
      expect(result).to.be.equal('tagged')
    })
  })

  describe('._dependencies()', function () {
    let result
    describe('when an out dir is configured', function () {
      beforeEach(function () {
        __.set(bumper.config, 'dependencies.output', {
          directory: 'blackduck/',
          requirementsFile: 'js-requirements.json',
          reposFile: 'repos',
          ignoreFile: 'ignore'
        })

        return bumper._dependencies().then((r) => {
          result = r
        })
      })

      it('should return a promise resolving to nothing', function () {
        expect(result).to.equal(undefined)
      })
    })

    describe('when no dir is configured', function () {
      beforeEach(function () {
        return bumper._dependencies((r) => {
          result = r
        })
      })

      it('should return a promise resolving to nothing', function () {
        expect(result).to.equal(undefined)
      })
    })
  })

  describe('._generateDependencySnapshot()', function () {
    let ret
    beforeEach(function () {
      bumper.config.dependencySnapshotFile = 'snapshot-file'
      execStub.withArgs('npm prune').returns(Promise.resolve('prune-done'))
      execStub.withArgs('npm shrinkwrap --dev').returns(Promise.resolve('shrinkwrap-done'))
      execStub.returns(Promise.resolve('move-done'))

      return bumper._generateDependencySnapshot().then((resp) => {
        ret = resp
      })
    })

    it('should prune node_modules so shrinkwrap will work', function () {
      expect(execStub).to.have.been.calledWith('npm prune')
    })

    it('should generate the dependency snapshot', function () {
      expect(execStub).to.have.been.calledWith('npm shrinkwrap --dev')
    })

    it('should rename the dependency snapshot', function () {
      expect(execStub).to.have.been.calledWith('mv npm-shrinkwrap.json snapshot-file')
    })

    it('should return the response from the second exec', function () {
      expect(ret).to.equal('move-done')
    })
  })

  describe('._getLastPr()', function () {
    let getPrResolver, resolution, rejection, promise

    beforeEach(function () {
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

    it('should call git log', function () {
      expect(execStub).to.have.been.calledWith('git log -10 --oneline')
    })

    describe('when getPr succeeds', function () {
      beforeEach(function () {
        getPrResolver.resolve('the-pr')
        return promise
      })

      it('should parse out the PR number from the git log and passes it to vcs.getPr()', function () {
        expect(bumper.vcs.getPr).to.have.been.calledWith('30')
      })

      it('should resolve with the pr', function () {
        expect(resolution).to.be.equal('the-pr')
      })
    })

    describe('when getPr fails', function () {
      beforeEach(function (done) {
        getPrResolver.reject('the-error')
        promise.catch(() => {
          done()
        })
      })

      it('should parse out the PR number from the git log and passes it to vcs.getPr()', function () {
        expect(bumper.vcs.getPr).to.have.been.calledWith('30')
      })

      it('should reject with the error', function () {
        expect(rejection).to.be.equal('the-error')
      })
    })
  })

  describe('._getMergedPrInfo()', function () {
    let result
    beforeEach(function () {
      bumper.config = {foo: 'bar'}
      bumper.vcs = {bar: 'baz'}

      sandbox.stub(bumper, '_getLastPr').returns(Promise.resolve('the-pr'))
      sandbox.stub(utils, 'getScopeForPr').returns('major')
      sandbox.stub(utils, 'getChangelogForPr').returns('my-changelog')

      return bumper._getMergedPrInfo().then((res) => {
        result = res
      })
    })

    it('should get the last PR to be merged', function () {
      expect(bumper._getLastPr).to.have.callCount(1)
    })

    it('should gets the scope for the given pr', function () {
      expect(utils.getScopeForPr).to.have.been.calledWith('the-pr')
    })

    it('should get the changelog for the given pr', function () {
      expect(utils.getChangelogForPr).to.have.been.calledWith('the-pr')
    })

    it('should resolve with the info', function () {
      expect(result).to.be.eql({changelog: 'my-changelog', scope: 'major'})
    })
  })

  describe('._getOpenPrInfo()', function () {
    let result
    beforeEach(function () {
      bumper.config = {foo: 'bar', prNumber: '123'}
      bumper.vcs = {getPr: function () {}}

      sandbox.stub(bumper.vcs, 'getPr').returns(Promise.resolve('the-pr'))
      sandbox.stub(utils, 'getScopeForPr').returns('patch')
      sandbox.stub(utils, 'getChangelogForPr').returns('the-changelog')
    })

    describe('when prependChangelog is set', function () {
      beforeEach(function () {
        bumper.config.prependChangelog = true
        return bumper._getOpenPrInfo().then((res) => {
          result = res
        })
      })

      it('should fetch the PR', function () {
        expect(bumper.vcs.getPr).to.have.been.calledWith('123')
      })

      it('should get the scope for the given pr', function () {
        expect(utils.getScopeForPr).to.have.been.calledWith('the-pr')
      })

      it('should get the changelog for the given pr', function () {
        expect(utils.getChangelogForPr).to.have.been.calledWith('the-pr')
      })

      it('should resolve with the info', function () {
        expect(result).to.be.eql({
          changelog: 'the-changelog',
          scope: 'patch'
        })
      })
    })

    describe('when prependChangelog is not set', function () {
      beforeEach(function () {
        bumper.config.prependChangelog = false
        return bumper._getOpenPrInfo().then((res) => {
          result = res
        })
      })

      it('should fetch the PR', function () {
        expect(bumper.vcs.getPr).to.have.been.calledWith('123')
      })

      it('should get the scope for the given pr', function () {
        expect(utils.getScopeForPr).to.have.been.calledWith('the-pr')
      })

      it('should not get the changelog for the given pr', function () {
        expect(utils.getChangelogForPr).to.have.callCount(0)
      })

      it('should resolve with the info', function () {
        expect(result).to.be.eql({
          changelog: '',
          scope: 'patch'
        })
      })
    })
  })

  describe('._prependChangelog()', function () {
    let ret, info
    beforeEach(function () {
      info = {
        changelog: 'the-changelog-content',
        version: '1.2.3'
      }
      prependStub.returns(Promise.resolve('return-value'))

      return bumper._prependChangelog(info, 'change-log-file').then((resp) => {
        ret = resp
      })
    })

    it('should prepend the changelog', function () {
      expect(prependStub).to.have.been.calledWith('change-log-file', '# 1.2.3\nthe-changelog-content\n\n')
    })

    it('should return the response from the prepend', function () {
      expect(ret).to.equal('return-value')
    })
  })
})
