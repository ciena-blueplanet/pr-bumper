'use strict'

const chai = require('chai')
const deepFreeze = require('freezly').default
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const expect = chai.expect
chai.use(sinonChai)

const logger = require('../../lib/logger')
const CiBase = require('../../lib/ci/base')
const TeamCity = require('../../lib/ci/teamcity')
const testUtils = require('./utils')
const ensureCiBaseMethodIsUsed = testUtils.ensureCiBaseMethodIsUsed

const CONFIG = deepFreeze({
  id: 'config'
})

const VCS = deepFreeze({
  id: 'vcs'
})

describe('CI / TeamCity', function () {
  let teamcity, sandbox
  let ctx = {}

  beforeEach(function () {
    sandbox = sinon.sandbox.create()

    // get rid of all logging messages in the tests (and let us test for them if we want)
    sandbox.stub(logger, 'log')
    teamcity = new TeamCity(CONFIG, VCS)

    ctx.ci = teamcity
    ctx.sandbox = sandbox
  })

  afterEach(function () {
    sandbox.restore()
  })

  it('should save the config', function () {
    expect(teamcity.config).to.deep.equal(CONFIG)
  })

  it('should save the vcs', function () {
    expect(teamcity.vcs).to.deep.equal(VCS)
  })

  it('should extend CiBase', function () {
    expect(teamcity).to.be.an.instanceof(CiBase)
  })

  ensureCiBaseMethodIsUsed(ctx, 'add')
  ensureCiBaseMethodIsUsed(ctx, 'commit')
  ensureCiBaseMethodIsUsed(ctx, 'push')
  ensureCiBaseMethodIsUsed(ctx, 'setupGitEnv')
})
