'use strict'

const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const expect = chai.expect
chai.use(sinonChai)

const logger = require('../../lib/logger')
const CiBase = require('../../lib/ci/base')
const Bamboo = require('../../lib/ci/bamboo')
const testUtils = require('./utils')
const ensureCiBaseMethodIsUsed = testUtils.ensureCiBaseMethodIsUsed

describe('CI / Bamboo', function () {
  let bamboo, sandbox
  let ctx = {}

  beforeEach(function () {
    sandbox = sinon.sandbox.create()

    // get rid of all logging messages in the tests (and let us test for them if we want)
    sandbox.stub(logger, 'log')
    bamboo = new Bamboo({id: 'config'}, {id: 'vcs'})

    ctx.ci = bamboo
    ctx.sandbox = sandbox
  })

  afterEach(function () {
    sandbox.restore()
  })

  it('should save the config', function () {
    expect(bamboo.config).to.eql({id: 'config'})
  })

  it('should save the vcs', function () {
    expect(bamboo.vcs).to.eql({id: 'vcs'})
  })

  it('should extend CiBase', function () {
    expect(bamboo).to.be.an.instanceof(CiBase)
  })

  ensureCiBaseMethodIsUsed(ctx, 'add')
  ensureCiBaseMethodIsUsed(ctx, 'commit')
  ensureCiBaseMethodIsUsed(ctx, 'push')
  ensureCiBaseMethodIsUsed(ctx, 'setupGitEnv')
})
