'use strict'

const rewire = require('rewire')
const sinon = require('sinon')
const expect = require('chai').expect
const logger = require('../../lib/logger')
const CiBase = rewire('../../lib/ci/base')

describe('CiBase', () => {
  let execStub, revertExecRewire, base, sandbox
  beforeEach(() => {
    sandbox = sinon.sandbox.create()

    // get rid of all logging messages in the tests (and let us test for them if we want)
    sandbox.stub(logger, 'log')

    // stub out the top-level 'exec'
    execStub = sandbox.stub()
    revertExecRewire = CiBase.__set__('exec', execStub)

    base = new CiBase({id: 'config', branch: 'my-branch'}, {id: 'vcs'})
  })

  afterEach(() => {
    // undo the rewiring
    revertExecRewire()

    // remove all stubs/spies
    sandbox.restore()
  })

  it('saves the config', () => {
    expect(base.config).to.be.eql({id: 'config', branch: 'my-branch'})
  })

  it('saves the vcs', () => {
    expect(base.vcs).to.be.eql({id: 'vcs'})
  })

  describe('.add()', () => {
    let result
    beforeEach(() => {
      execStub.returns(Promise.resolve('added'))
      return base.add(['foo', 'bar', 'baz']).then((res) => {
        result = res
      })
    })

    it('adds the files to git', () => {
      expect(execStub.lastCall.args).to.be.eql(['git add foo bar baz'])
    })

    it('resolves with the result of the git command', () => {
      expect(result).to.be.equal('added')
    })
  })

  describe('.commit()', () => {
    let result
    beforeEach(() => {
      execStub.returns(Promise.resolve('committed'))
      return base.commit('my summary message', 'my detail message').then((res) => {
        result = res
      })
    })

    it('commits the files to git', () => {
      expect(execStub.lastCall.args).to.be.eql(['git commit -m "my summary message" -m "my detail message"'])
    })

    it('resolves with the result of the git command', () => {
      expect(result).to.be.equal('committed')
    })
  })

  describe('.push()', () => {
    let result
    beforeEach(() => {
      execStub.returns(Promise.resolve('pushed'))
      return base.push().then((res) => {
        result = res
      })
    })

    it('logs that it is about to push', () => {
      expect(logger.log.lastCall.args).to.be.eql(['Pushing my-branch to origin'])
    })

    it('pushes origin to master with --tags', () => {
      expect(execStub.lastCall.args).to.be.eql(['git push origin my-branch --tags'])
    })

    it('resolves with the result of the git command', () => {
      expect(result).to.be.equal('pushed')
    })
  })

  describe('.setupGitEnv()', () => {
    let result
    beforeEach(() => {
      base.config = {
        ci: {
          gitUser: {
            email: 'ci-user@domain.com',
            name: 'ci-user'
          }
        }
      }

      execStub.returns(Promise.resolve('executed'))
      return base.setupGitEnv().then((res) => {
        result = res
      })
    })

    it('configures the git user\'s email address', () => {
      expect(execStub.firstCall.args).to.be.eql(['git config --global user.email "ci-user@domain.com"'])
    })

    it('configures the git user\'s name', () => {
      expect(execStub.secondCall.args).to.be.eql(['git config --global user.name "ci-user"'])
    })

    it('resolves with the result of the git command', () => {
      expect(result).to.be.equal('executed')
    })
  })
})
