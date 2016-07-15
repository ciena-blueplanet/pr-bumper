'use strict'

const rewire = require('rewire')
const sinon = require('sinon')
const expect = require('chai').expect
const Promise = require('promise')
const logger = require('../../lib/logger')
const blackduck = rewire('../../lib/compliance/blackduck')

describe('blackduck', () => {
  let sandbox
  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    sandbox.stub(logger, 'log')
  })

  afterEach(() => {
    // remove all stubs/spies
    sandbox.restore()
  })

  describe('parses a license', function () {
    it('for MIT', function () {
      const licenseObject = {
        text: 'MIT blah blah blah',
        filePath: '../some/MIT/path'
      }
      expect(blackduck._parseLicense(licenseObject)).to.eql('MIT')
    })

    it('for ISC', function () {
      const licenseObject = {
        text: 'ISC blah blah blah',
        filePath: '../some/ISC/path'
      }
      expect(blackduck._parseLicense(licenseObject)).to.eql('ISC')
    })

    it('for Apache', function () {
      const licenseObject = {
        text: 'Apache blah blah blah',
        filePath: '../some/Apache/path'
      }
      expect(blackduck._parseLicense(licenseObject)).to.eql('Apache')
    })

    it('for unknown license', function () {
      const licenseObject = {
        text: 'Unknown blah blah blah',
        filePath: '../some/unknown/path'
      }
      expect(blackduck._parseLicense(licenseObject)).to.eql('UNKNOWN')
    })
  })

  describe('gets a license', function () {
    it('for package sources', function () {
      const licenseSources = {
        package: {
          sources: [
            { license: 'MIT' },
            { license: 'Apache' }
          ]
        }
      }
      const expected = 'MIT, Apache'
      expect(blackduck._getLicense(licenseSources)).to.eql(expected)
    })

    it('for license sources', function () {
      const licenseSources = {
        package: {
          sources: []
        },
        license: {
          sources: [
            { text: 'MIT' },
            { text: 'Apache' },
            { text: 'blargh' }
          ]
        }
      }
      const expected = 'MIT, Apache, UNKNOWN'
      expect(blackduck._getLicense(licenseSources)).to.eql(expected)
    })
  })

  describe('gets npm license data', function () {
    let findLicenseStub
    let writeFileStub

    beforeEach(function () {
      findLicenseStub = sandbox.stub(blackduck, 'findLicenses')
      findLicenseStub.returns(Promise.resolve([
        {
          id: 'some-id',
          name: 'some-package-1',
          version: 1.0,
          licenseSources: undefined
        },
        {
          id: 'some-other-id',
          name: 'some-package-2',
          version: 2.0,
          licenseSources: {
            package: {
              sources: []
            },
            license: {
              sources: [
                { text: 'MIT' },
                { text: 'Apache' },
                { text: 'blargh' }
              ]
            }
          }
        }
      ]))
      writeFileStub = sandbox.stub(blackduck, 'writeFile')
      writeFileStub.returns(Promise.resolve())
    })

    it('and logs if there is none', function () {
      return blackduck.getNpmLicenseData('/some/path', '/some/output/path').then(() => {
        expect(logger.log.firstCall.args).to.eql(['ERROR: some-id has no licenseSources?'])
      })
    })

    it('attempts to write file with correct data', function () {
      const expectedData = [
        {
          version: 2.0,
          name: 'some-package-2',
          license: 'MIT, Apache, UNKNOWN'
        }
      ]
      return blackduck.getNpmLicenseData('/some/path', '/some/output/path').then((value) => {
        expect(writeFileStub.lastCall.args).to.eql([
          '/some/output/path',
          JSON.stringify({
            'schema-version': 1,
            data: expectedData
          }, null, '  ')
        ])
      })
    })

    it('returns file written message', function () {
      return blackduck.getNpmLicenseData('/some/path', '/some/output/path').then((value) => {
        expect(value).to.eql('successfully wrote /some/output/path')
      })
    })

    it('logs file write error', function () {
      writeFileStub.returns(Promise.reject('some error'))
      return blackduck.getNpmLicenseData('/some/path', '/some/output/path').catch(() => {
        expect(logger.log.lastCall.args).to.eql(['(1) ERROR: writing /some/output/path', 'some error'])
      })
    })
  })

  describe('gets package data', function () {
    let readFileStub
    const fileData = ' "ember-frost-1"\n "frost-1"'
    beforeEach(function () {
      readFileStub = sandbox.stub(blackduck, 'readFile')
      readFileStub.returns(Promise.resolve(fileData))
    })
    it('returns the correct repo paths', function () {
      const expected = 'https://bitbucket.ciena.com/scm/bp_frost/frost-1.git\nhttps://github.com/ciena-frost/ember-frost-1.git\n'
      return blackduck.getPackageData('/some/path', 'repo-name').then((paths) => {
        expect(paths).to.eql(expected)
      })
    })
  })
})
