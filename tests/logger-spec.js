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

  describe('.error()', () => {
    it('logs to console', () => {
      stub = sinon.stub(console, 'error')
      logger.error('foo bar baz')
      expect(console.error.lastCall.args).to.be.eql(['foo bar baz'])
      stub.restore()
    })
  })
})
