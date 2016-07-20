'use strict'

/* eslint no-useless-escape: 0 */

const rewire = require('rewire')
const sinon = require('sinon')
const expect = require('chai').expect
const Promise = require('promise')
const logger = require('../../lib/logger')
const dependencies = rewire('../../lib/compliance/dependencies')

describe('dependencies', function () {
  let sandbox
  let config
  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    sandbox.stub(logger, 'error')
    config = {
      repo: 'some-test-repo',
      dependencies: {
        production: true,
        output: {
          directory: 'output-test-dir',
          ignore: 'output-ignore-file',
          repos: 'output-repos-file',
          requirements: 'output-reqs-file'
        },
        additionalRepos: [
          {
            pattern: '\\s+"(ember\\-frost\\-\\S+)"',
            url: 'https://github.com/ciena-frost/${REPO_NAME}.git'
          },
          {
            pattern: '\\s+"(frost\\-\\S+)"',
            url: 'https://bitbucket.ciena.com/scm/bp_frost/${REPO_NAME}.git'
          }
        ]
      }
    }
  })

  afterEach(function () {
    // remove all stubs/spies
    sandbox.restore()
  })

  describe('parses a license', function () {
    it('for MIT', function () {
      const licenseObject = {
        text: 'MIT blah blah blah',
        filePath: '../some/MIT/path'
      }
      expect(dependencies._parseLicense(licenseObject)).to.eql('MIT')
    })

    it('for ISC', function () {
      const licenseObject = {
        text: 'ISC blah blah blah',
        filePath: '../some/ISC/path'
      }
      expect(dependencies._parseLicense(licenseObject)).to.eql('ISC')
    })

    it('for Apache', function () {
      const licenseObject = {
        text: 'Apache blah blah blah',
        filePath: '../some/Apache/path'
      }
      expect(dependencies._parseLicense(licenseObject)).to.eql('Apache')
    })

    it('for unknown license', function () {
      const licenseObject = {
        text: 'Unknown blah blah blah',
        filePath: '../some/unknown/path'
      }
      expect(dependencies._parseLicense(licenseObject)).to.eql('UNKNOWN')
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
      expect(dependencies._getLicense(licenseSources)).to.eql(expected)
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
      expect(dependencies._getLicense(licenseSources)).to.eql(expected)
    })
  })

  describe('gets npm license data', function () {
    let findLicenseStub
    let writeFileStub

    beforeEach(function () {
      findLicenseStub = sandbox.stub(dependencies, 'findLicenses')
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
      writeFileStub = sandbox.stub(dependencies, 'writeFile')
      writeFileStub.returns(Promise.resolve())
    })

    it('respects the production option', function () {
      return dependencies.getNpmLicenseData('/some/path', '/some/output/path', config).then(() => {
        expect(findLicenseStub.firstCall.args[0].production).to.eql(true)
      })
    })

    it('and logs if there is none', function () {
      return dependencies.getNpmLicenseData('/some/path', '/some/output/path', config).then(() => {
        expect(logger.error.firstCall.args).to.eql(['ERROR: some-id has no licenseSources?'])
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
      return dependencies.getNpmLicenseData('/some/path', '/some/output/path', config).then((value) => {
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
      return dependencies.getNpmLicenseData('/some/path', '/some/output/path', config).then((value) => {
        expect(value).to.eql('successfully wrote /some/output/path')
      })
    })

    it('logs file write error', function () {
      writeFileStub.returns(Promise.reject('some error'))
      return dependencies.getNpmLicenseData('/some/path', '/some/output/path', config).catch(() => {
        expect(logger.error.lastCall.args).to.eql(['(1) ERROR: writing /some/output/path', 'some error'])
      })
    })
  })

  describe('gets package data', function () {
    let readFileStub
    let repos = ['"ember-frost-1"', '"frost-1"']
    const fileData = `  ${repos.join('\n  ')}\n`
    beforeEach(function () {
      readFileStub = sandbox.stub(dependencies, 'readFile')
      readFileStub.returns(Promise.resolve(fileData))
    })
    it('returns the correct repo paths', function () {
      const addlRepos = config.dependencies.additionalRepos
      const expectedUrl1 = addlRepos[1].url.split('${REPO_NAME}').join(repos[1].split('"').join(''))
      const expectedUrl2 = addlRepos[0].url.split('${REPO_NAME}').join(repos[0].split('"').join(''))
      const expected = `${expectedUrl1}\n${expectedUrl2}\n`
      return dependencies.getPackageData('/some/path', config).then((paths) => {
        expect(paths).to.eql(expected)
      })
    })
  })
})
