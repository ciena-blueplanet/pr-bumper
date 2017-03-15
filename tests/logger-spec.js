'use strict'

const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const expect = chai.expect
chai.use(sinonChai)

const name = require('../package.json').name
const logger = require('../lib/logger')

describe('logger', function () {
  let stub, realVerbose

  beforeEach(function () {
    realVerbose = process.env['VERBOSE']
  })

  afterEach(function () {
    process.env['VERBOSE'] = realVerbose
    if (stub) {
      stub.restore()
    }
  })

  describe('.log()', function () {
    describe('when VERBOSE is not in env', function () {
      beforeEach(function () {
        delete process.env['VERBOSE']
      })

      describe('when force is not given', function () {
        // NOTE: we do not want to stub console.log in beforeEach b/c it messes with mocha's reporting

        it('should not log to console', function () {
          stub = sinon.stub(console, 'log')
          logger.log('foo bar baz')
          expect(console.log).to.have.callCount(0)
        })
      })

      describe('when force is given', function () {
        it('should log to console', function () {
          stub = sinon.stub(console, 'log')
          logger.log('foo bar baz', true)
          expect(console.log).to.have.been.calledWith(`${name}: foo bar baz`)
        })
      })
    })

    describe('when VERBOSE is in env', function () {
      beforeEach(function () {
        process.env['VERBOSE'] = '1'
      })

      describe('when force is not given', function () {
        // NOTE: we do not want to stub console.log in beforeEach b/c it messes with mocha's reporting

        it('should log to console', function () {
          stub = sinon.stub(console, 'log')
          logger.log('foo bar baz')
          expect(console.log).to.have.been.calledWith(`${name}: foo bar baz`)
        })
      })

      describe('when force is given', function () {
        it('should log to console', function () {
          stub = sinon.stub(console, 'log')
          logger.log('foo bar baz', true)
          expect(console.log).to.have.been.calledWith(`${name}: foo bar baz`)
        })
      })
    })
  })

  describe('.error()', function () {
    describe('when VERBOSE is not in the env', function () {
      beforeEach(function () {
        delete process.env['VERBOSE']
      })

      it('should log to console', function () {
        stub = sinon.stub(console, 'error')
        logger.error('foo bar baz')
        expect(console.error).to.have.been.calledWith(`${name}: foo bar baz`)
      })
    })

    describe('when VERBOSE is in the env', function () {
      beforeEach(function () {
        process.env['VERBOSE'] = '1'
      })

      it('should log to console', function () {
        stub = sinon.stub(console, 'error')
        logger.error('foo bar baz')
        expect(console.error).to.have.been.calledWith(`${name}: foo bar baz`)
      })
    })
  })
})
