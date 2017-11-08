import logger from '../src/logger'

const name = require('../package.json').name

describe('logger', () => {
  let realVerbose

  beforeEach(() => {
    realVerbose = process.env['VERBOSE']
  })

  afterEach(() => {
    process.env['VERBOSE'] = realVerbose
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

      describe('when logging error', () => {
        const error = new Error('foo bar')

        describe('when not logging additional message', () => {
          it('should not log to console when force is omited', () => {
            logger.log(error)
            expect(console.log).toHaveBeenCalledTimes(0)
          })

          it('should not log to console when force is false', () => {
            logger.log(error, false)
            expect(console.log).toHaveBeenCalledTimes(0)
          })

          it('should log to console when force is true', () => {
            logger.log(error, true)
            expect(console.log).toHaveBeenCalledWith(`${name}: ${error}`)
          })
        })

        describe('when logging additional message', () => {
          it('should not log to console when force is omited', () => {
            logger.log(error, 'spam')
            expect(console.log).toHaveBeenCalledTimes(0)
          })

          it('should not log to console when force is false', () => {
            logger.log(error, 'spam', false)
            expect(console.log).toHaveBeenCalledTimes(0)
          })

          it('should log to console when force is true', () => {
            logger.log(error, 'spam', true)
            expect(console.log).toHaveBeenCalledWith(`${name}: ${error}`, 'spam')
          })
        })
      })

      describe('when logging string', () => {
        describe('when not logging additional message', () => {
          it('should not log to console when force is omited', () => {
            logger.log('foo bar baz')
            expect(console.log).toHaveBeenCalledTimes(0)
          })

          it('should not log to console when force is false', () => {
            logger.log('foo bar baz', false)
            expect(console.log).toHaveBeenCalledTimes(0)
          })

          it('should log to console when force is true', () => {
            logger.log('foo bar baz', true)
            expect(console.log).toHaveBeenCalledWith(`${name}: foo bar baz`)
          })
        })

        describe('when logging additional message', () => {
          it('should not log to console when force is omited', () => {
            logger.log('foo bar baz', 'spam')
            expect(console.log).toHaveBeenCalledTimes(0)
          })

          it('should not log to console when force is false', () => {
            logger.log('foo bar baz', 'spam', false)
            expect(console.log).toHaveBeenCalledTimes(0)
          })

          it('should log to console when force is true', () => {
            logger.log('foo bar baz', 'spam', true)
            expect(console.log).toHaveBeenCalledWith(`${name}: foo bar baz`, 'spam')
          })
        })
      })
    })

    describe('when VERBOSE is in env', () => {
      beforeEach(() => {
        process.env['VERBOSE'] = '1'
      })

      describe('when logging error', () => {
        const error = new Error('foo bar')

        describe('when not logging additional message', () => {
          it('should log to console when force is omited', () => {
            logger.log(error)
            expect(console.log).toHaveBeenCalledWith(`${name}: ${error}`)
          })

          it('should log to console when force is false', () => {
            logger.log(error, false)
            expect(console.log).toHaveBeenCalledWith(`${name}: ${error}`)
          })

          it('should log to console when force is true', () => {
            logger.log(error, true)
            expect(console.log).toHaveBeenCalledWith(`${name}: ${error}`)
          })
        })

        describe('when logging additional message', () => {
          it('should log to console when force is omited', () => {
            logger.log(error, 'spam')
            expect(console.log).toHaveBeenCalledWith(`${name}: ${error}`, 'spam')
          })

          it('should log to console when force is false', () => {
            logger.log(error, 'spam', false)
            expect(console.log).toHaveBeenCalledWith(`${name}: ${error}`, 'spam')
          })

          it('should log to console when force is true', () => {
            logger.log(error, 'spam', true)
            expect(console.log).toHaveBeenCalledWith(`${name}: ${error}`, 'spam')
          })
        })
      })

      describe('when logging string', () => {
        describe('when not logging additional message', () => {
          it('should log to console when force is omited', () => {
            logger.log('foo bar baz')
            expect(console.log).toHaveBeenCalledWith(`${name}: foo bar baz`)
          })

          it('should log to console when force is false', () => {
            logger.log('foo bar baz', false)
            expect(console.log).toHaveBeenCalledWith(`${name}: foo bar baz`)
          })

          it('should log to console when force is true', () => {
            logger.log('foo bar baz', true)
            expect(console.log).toHaveBeenCalledWith(`${name}: foo bar baz`)
          })
        })

        describe('when logging additional message', () => {
          it('should log to console when force is omited', () => {
            logger.log('foo bar baz', 'spam')
            expect(console.log).toHaveBeenCalledWith(`${name}: foo bar baz`, 'spam')
          })

          it('should log to console when force is false', () => {
            logger.log('foo bar baz', 'spam', false)
            expect(console.log).toHaveBeenCalledWith(`${name}: foo bar baz`, 'spam')
          })

          it('should log to console when force is true', () => {
            logger.log('foo bar baz', 'spam', true)
            expect(console.log).toHaveBeenCalledWith(`${name}: foo bar baz`, 'spam')
          })
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

      describe('when data is error', () => {
        const error = new Error('foo bar')

        it('should log to console when no additional error argument', () => {
          logger.error(error)
          expect(console.error).toHaveBeenCalledWith(`${name}: ${error}`)
        })

        it('should log to console when additional error argument', () => {
          const error2 = new Error('baz')
          logger.error(error, error2)
          expect(console.error).toHaveBeenCalledWith(`${name}: ${error}`, error2)
        })
      })

      describe('when data is string', () => {
        it('should log to console when no additional error argument', () => {
          logger.error('foo bar baz')
          expect(console.error).toHaveBeenCalledWith(`${name}: foo bar baz`)
        })

        it('should log to console when additional error argument', () => {
          const error = new Error('baz')
          logger.error('foo bar baz', error)
          expect(console.error).toHaveBeenCalledWith(`${name}: foo bar baz`, error)
        })
      })
    })

    describe('when VERBOSE is in the env', () => {
      beforeEach(() => {
        process.env['VERBOSE'] = '1'
      })

      describe('when data is error', () => {
        const error = new Error('foo bar')

        it('should log to console when no additional error argument', () => {
          logger.error(error)
          expect(console.error).toHaveBeenCalledWith(`${name}: ${error}`)
        })

        it('should log to console when additional error argument', () => {
          const error2 = new Error('baz')
          logger.error(error, error2)
          expect(console.error).toHaveBeenCalledWith(`${name}: ${error}`, error2)
        })
      })

      describe('when data is string', () => {
        it('should log to console when no additional error argument', () => {
          logger.error('foo bar baz')
          expect(console.error).toHaveBeenCalledWith(`${name}: foo bar baz`)
        })

        it('should log to console when additional error argument', () => {
          const error = new Error('baz')
          logger.error('foo bar baz', error)
          expect(console.error).toHaveBeenCalledWith(`${name}: foo bar baz`, error)
        })
      })
    })
  })
})
