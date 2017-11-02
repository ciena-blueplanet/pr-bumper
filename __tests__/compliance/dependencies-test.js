/* eslint no-useless-escape: 0 */

jest.mock('../../src/fs')
jest.mock('../../src/logger')
jest.mock('../../src/nlf')

import Promise from 'promise'

import {
  _getLicense,
  _parseLicense,
  getNpmLicenseData,
  getPackageData
} from '../../src/compliance/dependencies'
import {readFile, writeFile} from '../../src/fs'
import logger from '../../src/logger'
import {find as findLicenses} from '../../src/nlf'

describe('dependencies', () => {
  let config

  beforeEach(() => {
    config = {
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
      },
      vcs: {
        repository: {
          name: 'some-test-repo'
        }
      }
    }
  })

  describe('_parseLicense()', () => {
    it('should return MIT when MIT present', () => {
      expect(
        _parseLicense({
          text: 'MIT blah blah blah',
          filePath: '../some/MIT/path'
        })
      ).toBe('MIT')
    })

    it('should return MIT when mit present', () => {
      expect(
        _parseLicense({
          text: 'mit blah blah blah',
          filePath: '../some/mit/path'
        })
      ).toBe('MIT')
    })

    it('should return UNKNOWN when mitigate present', () => {
      expect(
        _parseLicense({
          text: 'mitigate blah blah blah',
          filePath: '../some/mitigate/path'
        })
      ).toBe('UNKNOWN')
    })

    it('should return UNKNOWN when emit present', () => {
      expect(
        _parseLicense({
          text: 'emit blah blah blah',
          filePath: '../some/emit/path'
        })
      ).toBe('UNKNOWN')
    })

    it('should return ISC when ISC present', () => {
      expect(
        _parseLicense({
          text: 'ISC blah blah blah',
          filePath: '../some/ISC/path'
        })
      ).toBe('ISC')
    })

    it('should return ISC when isc present', () => {
      expect(
        _parseLicense({
          text: 'isc blah blah blah',
          filePath: '../some/isc/path'
        })
      ).toBe('ISC')
    })

    it('should return ISC when misc present', () => {
      expect(
        _parseLicense({
          text: 'misc blah blah blah',
          filePath: '../some/misc/path'
        })
      ).toBe('UNKNOWN')
    })

    it('should return Apache when Apache present', () => {
      expect(
        _parseLicense({
          text: 'Apache blah blah blah',
          filePath: '../some/Apache/path'
        })
      ).toBe('Apache')
    })

    it('should return Apache when apache present', () => {
      expect(
        _parseLicense({
          text: 'apache blah blah blah',
          filePath: '../some/apache/path'
        })
      ).toBe('Apache')
    })

    it('should return UNKNOWN when no known license present', () => {
      expect(
        _parseLicense({
          text: 'Uber secret license blah blah blah',
          filePath: '../some/random/path'
        })
      ).toBe('UNKNOWN')
    })
  })

  describe('_getLicense()', () => {
    it('should get all licenses when using package sources', () => {
      expect(
        _getLicense({
          package: {
            sources: [
              {license: 'MIT'},
              {license: 'Apache'}
            ]
          }
        })
      ).toBe('MIT, Apache')
    })

    it('should get all licenses when using license sources', () => {
      expect(
        _getLicense({
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
      ).toBe('MIT, Apache, UNKNOWN')
    })
  })

  describe('getNpmLicenseData()', () => {
    beforeEach(() => {
      findLicenses.mockReturnValue(
        Promise.resolve([
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
        ])
      )
    })

    it('should function as expeced when it fails to write file', () => {
      writeFile.mockImplementation(() => Promise.reject('some error'))
      return getNpmLicenseData('/some/path', '/some/output/path', config).catch(() => {
        expect(logger.error).toHaveBeenCalledWith('(1) ERROR: writing /some/output/path', 'some error')
      })
    })

    it('should funtion as expected when it successfully writes file', () => {
      writeFile.mockImplementation(() => Promise.resolve())
      return getNpmLicenseData('/some/path', '/some/output/path', config)
        .then(value => {
          expect(findLicenses).toHaveBeenCalledWith(expect.objectContaining({production: true}))
          expect(logger.error).toHaveBeenCalledWith('ERROR: some-id has no licenseSources?')
          expect(writeFile).toHaveBeenCalledWith(
            '/some/output/path',
            JSON.stringify({
              'schema-version': 1,
              data: [
                {
                  version: 2.0,
                  name: 'some-package-2',
                  license: 'MIT, Apache, UNKNOWN'
                }
              ]
            }, null, '  ')
          )
          expect(value).toEqual('successfully wrote /some/output/path')
        })
    })
  })

  describe('getPackageData()', () => {
    let fileData, repos

    beforeEach(() => {
      repos = ['"ember-frost-1"', '"frost-1"']
      fileData = `  ${repos.join('\n  ')}\n`
      readFile.mockReturnValue(Promise.resolve(fileData))
    })

    it('should return the correct repo paths', () => {
      const addlRepos = config.features.compliance.additionalRepos
      const expectedUrl1 = addlRepos[1].url.split('${REPO_NAME}').join(repos[1].split('"').join(''))
      const expectedUrl2 = addlRepos[0].url.split('${REPO_NAME}').join(repos[0].split('"').join(''))
      const expected = `${expectedUrl1}\n${expectedUrl2}\n`
      return getPackageData('/some/path', config).then(paths => {
        expect(paths).toEqual(expected)
      })
    })
  })
})
