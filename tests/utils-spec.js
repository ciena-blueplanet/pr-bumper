'use strict'

const path = require('path')
const Promise = require('promise')
const cpExec = require('child_process').exec
const expect = require('chai').expect

const utils = require('../lib/utils')

const exec = Promise.denodeify(cpExec)
const getVersionCmd = `node -e "console.log(require('./_package.json').version)"`

describe('utils', () => {
  let original
  beforeEach((done) => {
    original = path.join(__dirname, '_package.json')
    exec(`cp ${original} _package.json`)
      .then(() => {
        done()
      })
  })

  afterEach((done) => {
    exec(`rm -f _package.json`)
      .then(() => {
        done()
      })
  })

  describe('bumpVersion()', () => {
    let newVersion
    describe('a fix', () => {
      beforeEach((done) => {
        utils.bumpVersion('patch', '_package.json')
        exec(`${getVersionCmd}`)
          .then((stdout) => {
            newVersion = stdout.replace('\n', '')
            done()
          })
          .catch(() => {
            done()
          })
      })

      it('creates the correct version', () => {
        expect(newVersion).to.be.equal('1.2.4')
      })
    })

    describe('a feature', () => {
      beforeEach((done) => {
        utils.bumpVersion('minor', '_package.json')
        exec(`${getVersionCmd}`)
          .then((stdout) => {
            newVersion = stdout.replace('\n', '')
            done()
          })
          .catch(() => {
            done()
          })
      })

      it('creates the correct version', () => {
        expect(newVersion).to.be.equal('1.3.0')
      })
    })

    describe('a beaking change', () => {
      beforeEach((done) => {
        utils.bumpVersion('major', '_package.json')
        exec(`${getVersionCmd}`)
          .then((stdout) => {
            newVersion = stdout.replace('\n', '')
            done()
          })
          .catch(() => {
            done()
          })
      })

      it('creates the correct version', () => {
        expect(newVersion).to.be.equal('2.0.0')
      })
    })
  })
})
