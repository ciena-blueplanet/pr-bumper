'use strict'

const expect = require('chai').expect
const Promise = require('promise')
const sinon = require('sinon')

const utils = require('../lib/utils')
const logger = require('../lib/logger')
const Bumper = require('../lib/bumper')

describe('Bumper', () => {
  let bumper, sandbox
  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    sandbox.stub(logger, 'log')
    bumper = new Bumper({}, {})
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('.check()', () => {
    beforeEach(() => {
      sandbox.stub(bumper, 'getOpenPrScope').returns(Promise.resolve('minor'))
    })

    describe('when not a PR build', () => {
      beforeEach(() => {
        return bumper.check()
      })

      it('notifies user that it is skipping the check', () => {
        expect(logger.log.lastCall.args).to.eql(['pr-bumper: Not a PR build, skipping check'])
      })

      it('does not look for open pr scope', () => {
        expect(bumper.getOpenPrScope.called).to.be.false
      })
    })

    describe('when it is a PR build', () => {
      beforeEach(() => {
        bumper.config.isPr = true
        return bumper.check()
      })

      it('looks for open pr scope', () => {
        expect(bumper.getOpenPrScope.calledOnce).to.be.true
      })

      it('notifies user of the scope it found', () => {
        expect(logger.log.lastCall.args).to.eql(['Found a minor bump for the current PR'])
      })
    })
  })

  describe('.bump()', () => {
    let result
    beforeEach(() => {
      bumper.config = {foo: 'bar'}
      bumper.vcs = {push: function () {}}

      sandbox.stub(bumper.vcs, 'push').returns(Promise.resolve('pushed'))
      sandbox.stub(bumper, 'getMergedPrScope').returns(Promise.resolve('minor'))
      sandbox.stub(utils, 'bumpVersion').returns(Promise.resolve())
      sandbox.stub(utils, 'commitChanges').returns(Promise.resolve())

      return bumper.bump().then((res) => {
        result = res
      })
    })

    it('gets the merged pr scope', () => {
      expect(bumper.getMergedPrScope.calledOnce).to.be.ok
    })

    it('bumps the version', () => {
      expect(utils.bumpVersion.lastCall.args).to.eql(['minor', 'package.json'])
    })

    it('commits the change', () => {
      expect(utils.commitChanges.lastCall.args).to.eql([{foo: 'bar'}])
    })

    it('resolves with the result of the vcs.push()', () => {
      expect(result).to.be.eql('pushed')
    })
  })

  describe('.getOpenPrScope()', () => {
    let result
    beforeEach(() => {
      bumper.config = {foo: 'bar'}
      bumper.vcs = {getOpenPrForSha: function () {}}

      sandbox.stub(utils, 'getSha').returns(Promise.resolve('my-sha'))
      sandbox.stub(bumper.vcs, 'getOpenPrForSha').returns(Promise.resolve('the-pr'))
      sandbox.stub(utils, 'getScopeForPr').returns(Promise.resolve('patch'))

      return bumper.getOpenPrScope().then((res) => {
        result = res
      })
    })

    it('gets the sha', () => {
      expect(utils.getSha.lastCall.args).to.be.eql([bumper.config, bumper.vcs])
    })

    it('fetches the open PR for the sha', () => {
      expect(bumper.vcs.getOpenPrForSha.lastCall.args).to.be.eql(['my-sha'])
    })

    it('gets the scope for the given pr', () => {
      expect(utils.getScopeForPr.lastCall.args).to.be.eql(['the-pr'])
    })

    it('resolves with the scope', () => {
      expect(result).to.be.eql('patch')
    })
  })

  describe('.getMergedPrScope()', () => {
    let result
    beforeEach(() => {
      bumper.config = {foo: 'bar'}
      bumper.vcs = {bar: 'baz'}

      sandbox.stub(utils, 'getLastPr').returns(Promise.resolve('the-pr'))
      sandbox.stub(utils, 'getScopeForPr').returns(Promise.resolve('major'))

      return bumper.getMergedPrScope().then((res) => {
        result = res
      })
    })

    it('gets the last PR to be merged', () => {
      expect(utils.getLastPr.lastCall.args).to.be.eql([bumper.config, bumper.vcs])
    })

    it('gets the scope for the given pr', () => {
      expect(utils.getScopeForPr.lastCall.args).to.be.eql(['the-pr'])
    })

    it('resolves with the scope', () => {
      expect(result).to.be.eql('major')
    })
  })
})
