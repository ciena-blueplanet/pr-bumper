'use strict'

const sinon = require('sinon')
const expect = require('chai').expect
const logger = require('../../lib/logger')
const CiBase = require('../../lib/ci/base')
const TeamCity = require('../../lib/ci/teamcity')
const testUtils = require('./utils')
const ensureCiBaseMethodIsUsed = testUtils.ensureCiBaseMethodIsUsed

describe('TeamCity', () => {
  let teamcity, sandbox
  let ctx = {}

  beforeEach(() => {
    sandbox = sinon.sandbox.create()

    // get rid of all logging messages in the tests (and let us test for them if we want)
    sandbox.stub(logger, 'log')
    teamcity = new TeamCity({id: 'config'}, {id: 'vcs'})

    ctx.ci = teamcity
    ctx.sandbox = sandbox
  })

  afterEach(() => {
    // remove all stubs/spies
    sandbox.restore()
  })

  it('saves the config', () => {
    expect(teamcity.config).to.be.eql({id: 'config'})
  })

  it('saves the vcs', () => {
    expect(teamcity.vcs).to.be.eql({id: 'vcs'})
  })

  it('should extend CiBase', () => {
    expect(teamcity).to.be.an.instanceof(CiBase)
  })

  ensureCiBaseMethodIsUsed(ctx, 'add')
  ensureCiBaseMethodIsUsed(ctx, 'commit')
  ensureCiBaseMethodIsUsed(ctx, 'push')
  ensureCiBaseMethodIsUsed(ctx, 'setupGitEnv')
})
