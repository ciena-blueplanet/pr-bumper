'use strict'

const chai = require('chai')
const deepFreeze = require('freezly').default
const rewire = require('rewire')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const expect = chai.expect
chai.use(sinonChai)

const logger = require('../../lib/logger')
const CiBase = rewire('../../lib/ci/base')

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

describe('CI / Base', function () {
  let execStub, revertExecRewire, base, sandbox
  beforeEach(function () {
    sandbox = sinon.sandbox.create()

    // get rid of all logging messages in the tests (and let us test for them if we want)
    sandbox.stub(logger, 'log')

    // stub out the top-level 'exec'
    execStub = sandbox.stub()
    revertExecRewire = CiBase.__set__('exec', execStub)
    base = new CiBase(CONFIG, VCS)
  })

  afterEach(function () {
    // undo the rewiring
    revertExecRewire()

    // remove all stubs/spies
    sandbox.restore()
  })

  it('should save the config', function () {
    expect(base.config).to.equal(CONFIG)
  })

  it('should save the vcs', function () {
    expect(base.vcs).to.deep.equal(VCS)
  })

  describe('.add()', function () {
    let result
    beforeEach(function () {
      execStub.returns(Promise.resolve('added'))
      return base.add(['foo', 'bar', 'baz'])
        .then((res) => {
          result = res
        })
    })

    it('should add the files to git', function () {
      expect(execStub).to.have.been.calledWith('git add foo bar baz')
    })

    it('should resolve with the result of the git command', function () {
      expect(result).to.equal('added')
    })
  })

  describe('.commit()', function () {
    let result
    beforeEach(function () {
      execStub.returns(Promise.resolve('committed'))
      return base.commit('my summary message', 'my detail message')
        .then((res) => {
          result = res
        })
    })

    it('should commit the files to git', function () {
      expect(execStub).to.have.been.calledWith('git commit -m "my summary message" -m "my detail message"')
    })

    it('should resolve with the result of the git command', function () {
      expect(result).to.equal('committed')
    })
  })

  describe('.getLastCommitMsg()', function () {
    let result
    beforeEach(function () {
      execStub.returns(Promise.resolve('Fix all the things'))
      return base.getLastCommitMsg()
        .then((res) => {
          result = res
        })
    })

    it('should commit the files to git', function () {
      expect(execStub).to.have.been.calledWith('git log --pretty=format:\'%s\' -1')
    })

    it('should resolve with the result of the git command', function () {
      expect(result).to.equal('Fix all the things')
    })
  })

  describe('.push()', function () {
    let result
    beforeEach(function () {
      base.vcs = deepFreeze({
        addRemoteForPush: sandbox.stub().returns(Promise.resolve('my-origin'))
      })
      execStub.returns(Promise.resolve('pushed'))
      return base.push()
        .then((res) => {
          result = res
        })
    })

    it('should add the push remote via the vcs', function () {
      expect(base.vcs.addRemoteForPush).to.have.callCount(1)
    })

    it('should log that it is about to push', function () {
      expect(logger.log).to.have.been.calledWith('Pushing my-branch to my-origin')
    })

    it('should push origin to master with --tags', function () {
      expect(execStub).to.have.been.calledWith('git push my-origin my-branch --tags')
    })

    it('should resolve with the result of the git command', function () {
      expect(result).to.equal('pushed')
    })
  })

  describe('.setupGitEnv()', function () {
    let result
    beforeEach(function () {
      base.config = deepFreeze({
        ci: {
          gitUser: {
            email: 'ci-user@domain.com',
            name: 'ci-user'
          }
        }
      })

      execStub.returns(Promise.resolve('executed'))
      return base.setupGitEnv()
        .then((res) => {
          result = res
        })
    })

    it('should configure the git user\'s email address', function () {
      expect(execStub).to.have.been.calledWith('git config --global user.email "ci-user@domain.com"')
    })

    it('should configure the git user\'s name', function () {
      expect(execStub).to.have.been.calledWith('git config --global user.name "ci-user"')
    })

    it('should resolve with the result of the git command', function () {
      expect(result).to.equal('executed')
    })
  })

  describe('.tag()', function () {
    let result
    beforeEach(function () {
      execStub.returns(Promise.resolve('tagged'))
      return base.tag('v1.2.3', 'Super-cool tag description')
        .then((res) => {
          result = res
        })
    })

    it('should create the tag', function () {
      expect(execStub).to.have.been.calledWith('git tag v1.2.3 -a -m "Super-cool tag description"')
    })

    it('should resolve with the result of the exec call', function () {
      expect(result).to.equal('tagged')
    })
  })
})
