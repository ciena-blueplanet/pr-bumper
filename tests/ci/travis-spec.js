'use strict'

const rewire = require('rewire')
const sinon = require('sinon')
const expect = require('chai').expect
const logger = require('../../lib/logger')
const CiBase = require('../../lib/ci/base')
const Travis = rewire('../../lib/ci/travis')
const testUtils = require('./utils')
const ensureCiBaseMethodIsUsed = testUtils.ensureCiBaseMethodIsUsed

describe('Travis', () => {
  let execStub, revertExecRewire, travis, sandbox
  let ctx = {}

  beforeEach(() => {
    sandbox = sinon.sandbox.create()

    // get rid of all logging messages in the tests (and let us test for them if we want)
    sandbox.stub(logger, 'log')

    // stub out the top-level 'exec'
    execStub = sandbox.stub()
    revertExecRewire = Travis.__set__('exec', execStub)

    travis = new Travis({id: 'config', branch: 'my-branch'}, {id: 'vcs'})

    ctx.ci = travis
    ctx.sandbox = sandbox
  })

  afterEach(() => {
    // undo the rewiring
    revertExecRewire()

    // remove all stubs/spies
    sandbox.restore()
  })

  it('saves the config', () => {
    expect(travis.config).to.be.eql({id: 'config', branch: 'my-branch'})
  })

  it('saves the vcs', () => {
    expect(travis.vcs).to.be.eql({id: 'vcs'})
  })

  it('should extend CiBase', () => {
    expect(travis).to.be.an.instanceof(CiBase)
  })

  ensureCiBaseMethodIsUsed(ctx, 'add')
  ensureCiBaseMethodIsUsed(ctx, 'commit')

  describe('.push()', () => {
    let result
    beforeEach(() => {
      travis.vcs = {addRemoteForPush () {}}
      sandbox.stub(travis.vcs, 'addRemoteForPush').returns(Promise.resolve('ci-origin'))
      execStub.returns(Promise.resolve('pushed'))

      return travis.push().then((res) => {
        result = res
      })
    })

    it('adds the push remote via the vcs', () => {
      expect(travis.vcs.addRemoteForPush.calledOnce).to.be.true
    })

    it('logs that it is about to push my-master to the new remote', () => {
      expect(logger.log.lastCall.args).to.be.eql(['Pushing ci-my-branch to ci-origin'])
    })

    it('pushes the ci-my-branch branch to new remote', () => {
      expect(execStub.lastCall.args).to.be.eql(['git push ci-origin ci-my-branch:refs/heads/my-branch --tags'])
    })

    it('resolves with result of the git push', () => {
      expect(result).to.be.equal('pushed')
    })
  })

  describe('.setupGitEnv()', () => {
    let result
    beforeEach(() => {
      sandbox.stub(CiBase.prototype, 'setupGitEnv').returns(Promise.resolve())
      execStub.returns(Promise.resolve('checked-out'))

      return travis.setupGitEnv().then((res) => {
        result = res
      })
    })

    it('calls the base .setupGitEnv()', () => {
      expect(CiBase.prototype.setupGitEnv.calledOnce).to.be.true
    })

    it('creates and checks out ci-my-branch branch', () => {
      expect(execStub.lastCall.args).to.be.eql(['git checkout -b ci-my-branch'])
    })

    it('resolves with the result of the git checkout', () => {
      expect(result).to.be.equal('checked-out')
    })
  })
})
