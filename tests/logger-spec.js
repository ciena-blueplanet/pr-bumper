'use strict'

const expect = require('chai').expect
const sinon = require('sinon')

const logger = require('../lib/logger')

describe('logger', () => {
  let stub
  describe('.log()', () => {
    it('logs to console', () => {
      stub = sinon.stub(console, 'log')
      logger.log('foo bar baz')
      expect(console.log.lastCall.args).to.be.eql(['foo bar baz'])
      stub.restore()
    })
  })
})
