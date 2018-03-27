'use strict'

/* eslint no-useless-escape: 0 */

const chai = require('chai')
const deepFreeze = require('freezly').default
const Promise = require('promise')
const rewire = require('rewire')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const expect = chai.expect
chai.use(sinonChai)

const logger = require('../../lib/logger')
const dependencies = rewire('../../lib/compliance/dependencies')

const CONFIG = deepFreeze({
  features: {
    compliance: {
      enabled: true,
      production: true,
      output: {
        directory: 'output-test-dir',
        ignore: 'output-ignore-file',
        repos: 'output-repos-file',
        requirements: 'output-reqs-file'
      },
      /* eslint-disable */
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
      /* eslint-enable */
    }
  },
  vcs: {
    repository: {
      name: 'some-test-repo'
    }
  }
})

describe('dependencies', function () {
  let sandbox

  beforeEach(function () {
    sandbox = sinon.sandbox.create()
    sandbox.stub(logger, 'error')
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('_parseLicense()', function () {
    let licenseObject, ret
    describe('when MIT present', function () {
      beforeEach(function () {
        licenseObject = deepFreeze({
          text: 'MIT blah blah blah',
          filePath: '../some/MIT/path'
        })

        ret = dependencies._parseLicense(licenseObject)
      })

      it('should detect MIT', function () {
        expect(ret).to.equal('MIT')
      })
    })

    describe('when ISC present', function () {
      beforeEach(function () {
        licenseObject = deepFreeze({
          text: 'ISC blah blah blah',
          filePath: '../some/ISC/path'
        })

        ret = dependencies._parseLicense(licenseObject)
      })

      it('should detect ISC', function () {
        expect(ret).to.equal('ISC')
      })
    })

    describe('when Apache present', function () {
      beforeEach(function () {
        licenseObject = deepFreeze({
          text: 'Apache blah blah blah',
          filePath: '../some/Apache/path'
        })

        ret = dependencies._parseLicense(licenseObject)
      })

      it('should detect Apache', function () {
        expect(ret).to.equal('Apache')
      })
    })

    describe('when no known license present', function () {
      beforeEach(function () {
        licenseObject = deepFreeze({
          text: 'Uber secret license blah blah blah',
          filePath: '../some/random/path'
        })

        ret = dependencies._parseLicense(licenseObject)
      })

      it('should detect UNKNOWN', function () {
        expect(ret).to.equal('UNKNOWN')
      })
    })
  })

  describe('_getLicense()', function () {
    let licenseSources, license
    describe('when using package sources', function () {
      beforeEach(function () {
        licenseSources = deepFreeze({
          package: {
            sources: [
              {license: 'MIT'},
              {license: 'Apache'}
            ]
          }
        })

        license = dependencies._getLicense(licenseSources)
      })

      it('should get all licenses', function () {
        expect(license).to.equal('MIT, Apache')
      })
    })

    describe('when using license sources', function () {
      beforeEach(function () {
        licenseSources = deepFreeze({
          package: {
            sources: []
          },
          license: {
            sources: [
              {text: 'MIT'},
              {text: 'Apache'},
              {text: 'blargh'}
            ]
          }
        })

        license = dependencies._getLicense(licenseSources)
      })

      it('should get all licenses', function () {
        expect(license).to.equal('MIT, Apache, UNKNOWN')
      })
    })
  })

  describe('getNpmLicenseData()', function () {
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
                {text: 'MIT'},
                {text: 'Apache'},
                {text: 'blargh'}
              ]
            }
          }
        }
      ]))

      sandbox.stub(logger, 'log')
      writeFileStub = sandbox.stub(dependencies, 'writeFile')
      writeFileStub.returns(Promise.resolve())
    })

    it('should respect the production option', function () {
      return dependencies.getNpmLicenseData('/some/path', '/some/output/path', CONFIG).then(() => {
        expect(findLicenseStub).to.have.been.calledWith(sinon.match({production: true}))
      })
    })

    it('should log if there is none', function () {
      return dependencies.getNpmLicenseData('/some/path', '/some/output/path', CONFIG).then(() => {
        expect(logger.error).to.have.been.calledWith('ERROR: some-id has no licenseSources?')
      })
    })

    it('should attempt to write file with correct data', function () {
      const expectedData = [
        {
          version: 2.0,
          name: 'some-package-2',
          license: 'MIT, Apache, UNKNOWN'
        }
      ]

      return dependencies.getNpmLicenseData('/some/path', '/some/output/path', CONFIG).then((value) => {
        expect(writeFileStub).to.have.been.calledWith(
          '/some/output/path',
          JSON.stringify({
            'schema-version': 1,
            data: expectedData
          }, null, '  ')
        )
      })
    })

    it('should return file written message', function () {
      return dependencies.getNpmLicenseData('/some/path', '/some/output/path', CONFIG).then((value) => {
        expect(value).to.deep.equal('successfully wrote /some/output/path')
      })
    })

    it('should log file write error', function () {
      writeFileStub.returns(Promise.reject('some error')) // eslint-disable-line prefer-promise-reject-errors
      return dependencies.getNpmLicenseData('/some/path', '/some/output/path', CONFIG).catch(() => {
        expect(logger.error).to.have.been.calledWith('(1) ERROR: writing /some/output/path', 'some error')
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
      sandbox.stub(logger, 'log')
    })

    it('should return the correct repo paths', function () {
      const addlRepos = CONFIG.features.compliance.additionalRepos
      /* eslint-disable */
      const expectedUrl1 = addlRepos[1].url.split('${REPO_NAME}').join(repos[1].split('"').join(''))
      const expectedUrl2 = addlRepos[0].url.split('${REPO_NAME}').join(repos[0].split('"').join(''))
      const expected = `${expectedUrl1}\n${expectedUrl2}\n`
      /* eslint-enable */
      return dependencies.getPackageData('/some/path', CONFIG).then((paths) => {
        expect(paths).to.deep.equal(expected)
      })
    })
  })
})
