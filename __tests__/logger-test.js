import logger from '../src/logger'

const name = require('../package.json').name

describe('logger', () => {
  let stub, realVerbose

  beforeEach(() => {
    realVerbose = process.env['VERBOSE']
  })

  afterEach(() => {
    process.env['VERBOSE'] = realVerbose
    if (stub) {
      stub.restore()
    }
  })

  describe('.log()', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      console.log.mockRestore()
    })

    describe('when VERBOSE is not in env', () => {
      beforeEach(() => {
        delete process.env['VERBOSE']
      })

      describe('when force is not given', () => {
        it('should not log to console', () => {
          logger.log('foo bar baz')
          expect(console.log).toHaveBeenCalledTimes(0)
        })
      })

      describe('when force is given', () => {
        it('should log to console', () => {
          logger.log('foo bar baz', true)
          expect(console.log).toHaveBeenCalledWith(`${name}: foo bar baz`)
        })
      })
    })

    describe('when VERBOSE is in env', () => {
      beforeEach(() => {
        process.env['VERBOSE'] = '1'
      })

      describe('when force is not given', () => {
        it('should log to console', () => {
          logger.log('foo bar baz')
          expect(console.log).toHaveBeenCalledWith(`${name}: foo bar baz`)
        })
      })

      describe('when force is given', () => {
        it('should log to console', () => {
          logger.log('foo bar baz', true)
          expect(console.log).toHaveBeenCalledWith(`${name}: foo bar baz`)
        })
      })
    })
  })

  describe('.error()', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      console.error.mockRestore()
    })

    describe('when VERBOSE is not in the env', () => {
      beforeEach(() => {
        delete process.env['VERBOSE']
      })

      it('should log to console', () => {
        logger.error('foo bar baz')
        expect(console.error).toHaveBeenCalledWith(`${name}: foo bar baz`)
      })
    })

    describe('when VERBOSE is in the env', () => {
      beforeEach(() => {
        process.env['VERBOSE'] = '1'
      })

      it('should log to console', () => {
        logger.error('foo bar baz')
        expect(console.error).toHaveBeenCalledWith(`${name}: foo bar baz`)
      })
    })
  })
})
