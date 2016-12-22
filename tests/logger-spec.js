'use strict'

const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const expect = chai.expect
chai.use(sinonChai)

const logger = require('../lib/logger')

describe('logger', function () {
  let stub
  describe('.log()', function () {
    it('should log to console', function () {
      stub = sinon.stub(console, 'log')
      logger.log('foo bar baz')
      expect(console.log).to.have.been.calledWith('foo bar baz')
      stub.restore()
    })
  })

  describe('.error()', function () {
    it('should log to console', function () {
      stub = sinon.stub(console, 'error')
      logger.error('foo bar baz')
      expect(console.error).to.have.been.calledWith('foo bar baz')
      stub.restore()
    })
  })
})
