'use strict'

const chai = require('chai')
const deepFreeze = require('freezly').default
const rewire = require('rewire')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const expect = chai.expect
chai.use(sinonChai)

const logger = require('../../lib/logger')
const CiBase = require('../../lib/ci/base')
const Travis = rewire('../../lib/ci/travis')
const testUtils = require('./utils')
const ensureCiBaseMethodIsUsed = testUtils.ensureCiBaseMethodIsUsed

const CONFIG = deepFreeze({
  computed: {
    ci: {
      branch: 'my-branch'
    }
  }
})

const VCS = deepFreeze({
  id: 'vcs'
})

describe('CI / Travis', function () {
  const ctx = {}
  let execStub, revertExecRewire, travis, sandbox

  beforeEach(function () {
    sandbox = sinon.sandbox.create()

    // get rid of all logging messages in the tests (and let us test for them if we want)
    sandbox.stub(logger, 'log')

    // stub out the top-level 'exec'
    execStub = sandbox.stub()
    revertExecRewire = Travis.__set__('exec', execStub)
    travis = new Travis(CONFIG, VCS)

    ctx.ci = travis
    ctx.sandbox = sandbox
  })

  afterEach(function () {
    // undo the rewiring
    revertExecRewire()

    sandbox.restore()
  })

  it('should save the config', function () {
    expect(travis.config).to.equal(CONFIG)
  })

  it('should save the vcs', function () {
    expect(travis.vcs).to.deep.equal(VCS)
  })

  it('should extend CiBase', function () {
    expect(travis).to.be.an.instanceof(CiBase)
  })

  ensureCiBaseMethodIsUsed(ctx, 'add')
  ensureCiBaseMethodIsUsed(ctx, 'commit')

  describe('.push()', function () {
    let result

    beforeEach(function () {
      travis.vcs = deepFreeze({
        addRemoteForPush: sinon.stub().returns(Promise.resolve('ci-origin'))
      })
      execStub.returns(Promise.resolve('pushed'))

      return travis.push().then((res) => {
        result = res
      })
    })

    it('should add the push remote via the vcs', function () {
      expect(travis.vcs.addRemoteForPush).to.have.callCount(1)
    })

    it('should log that it is about to push my-master to the new remote', function () {
      expect(logger.log).to.have.been.calledWith('Pushing ci-my-branch to ci-origin')
    })

    it('should push the ci-my-branch branch to new remote', function () {
      expect(execStub).to.have.been.calledWith('git push ci-origin ci-my-branch:refs/heads/my-branch --tags')
    })

    it('should resolve with result of the git push', function () {
      expect(result).to.be.equal('pushed')
    })
  })

  describe('.setupGitEnv()', function () {
    let result

    beforeEach(function () {
      sandbox.stub(CiBase.prototype, 'setupGitEnv').returns(Promise.resolve())
      execStub.returns(Promise.resolve('checked-out'))

      return travis.setupGitEnv().then((res) => {
        result = res
      })
    })

    it('should call the base .setupGitEnv()', function () {
      expect(CiBase.prototype.setupGitEnv).to.have.callCount(1)
    })

    it('should create and check out ci-my-branch branch', function () {
      expect(execStub).to.have.been.calledWith('git checkout -b ci-my-branch')
    })

    it('should resolve with the result of the git checkout', function () {
      expect(result).to.be.equal('checked-out')
    })
  })
})
