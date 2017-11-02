jest.mock('../src/compliance/dependencies')
jest.mock('../src/exec')
jest.mock('../src/fs')
jest.mock('../src/logger')
jest.mock('../src/prepend-file')
jest.mock('../src/utils')

import {exec as chExec} from 'child_process'
import __ from 'lodash'
import path from 'path'
import Promise from 'promise'

import Bumper from '../src/bumper'
import {run} from '../src/compliance/dependencies'
import exec from '../src/exec'
import {readFile, writeFile} from '../src/fs'
import logger from '../src/logger'
import prepend from '../src/prepend-file'
import * as utils from '../src/utils'

const pkgJson = require('../package.json')
const unmockedExec = Promise.denodeify(chExec)

function getVersionCmd (filename) {
  return `node -e "console.log(require('./${filename}').version)"`
}

/**
 * Helper for performing repetative tasks in setting up _maybeBumpVersion tests
 *
 * @param {Object} ctx - the context object so the function can pass some info back to the tests for validation
 * @param {String} filename - the name of the file to test with
 * @param {String} scope - the scope to bump
 * @param {String} expectedVersion - the expected version after the bump
 */
function testMaybeBumpVersion (ctx, filename, scope, expectedVersion) {
  describe(`a ${scope}`, () => {
    let bumper, info, newVersion
    beforeEach(() => {
      bumper = ctx.bumper

      info = bumper._maybeBumpVersion({scope, modifiedFiles: []}, filename)

      return unmockedExec(getVersionCmd(filename))
        .then(stdout => {
          newVersion = stdout.replace('\n', '')
        })
    })

    it('should create the correct version', () => {
      expect(newVersion).toBe(expectedVersion)
    })

    if (scope === 'none') {
      it('should not include the version', () => {
        expect(info.version).toBe(undefined)
      })

      it(`should not add "${filename}" to the list of modified files`, () => {
        expect(info.modifiedFiles).not.toContain(filename)
      })
    } else {
      it('should return the correct version', () => {
        expect(info.version).toBe(expectedVersion)
      })

      it(`should add "${filename}" to the list of modified files`, () => {
        expect(info.modifiedFiles).toContain(filename)
      })
    }
  })
}

describe('Bumper', () => {
  let bumper

  beforeEach(() => {
    run.mockReturnValue(Promise.resolve())

    bumper = new Bumper({
      ci: [],
      config: {
        isEnabled: jest.fn(() => {
          return {}
        })
      },
      vcs: {}
    })
  })

  afterEach(() => {
    logger.log.mockReset()
  })

  describe('.check()', () => {
    beforeEach(() => {
      jest.spyOn(bumper, '_getOpenPrInfo').mockReturnValue(Promise.resolve({scope: 'minor'}))
    })

    afterEach(() => {
      bumper._getOpenPrInfo.mockRestore()
    })

    describe('when not a PR build', () => {
      beforeEach(() => {
        __.set(bumper.config, 'computed.ci.isPr', false)
        return bumper.check()
      })

      it('should notify user that it is skipping the check', () => {
        expect(logger.log).toHaveBeenCalledWith('Not a PR build, skipping check')
      })

      it('should not look for open pr info', () => {
        expect(bumper._getOpenPrInfo).toHaveBeenCalledTimes(0)
      })
    })

    describe('when it is a PR build', () => {
      beforeEach(() => {
        __.set(bumper.config, 'computed.ci.isPr', true)
        return bumper.check()
      })

      it('should look for open pr info', () => {
        expect(bumper._getOpenPrInfo).toHaveBeenCalledTimes(1)
      })

      it('should notify user of the scope it found', () => {
        expect(logger.log).toHaveBeenCalledWith('Found a minor bump for the current PR')
      })
    })
  })

  describe('.checkCoverage()', () => {
    let result, error, errorMsg

    beforeEach(() => {
      result = error = null
      utils.maybePostComment.mockReturnValue(Promise.resolve())
    })

    afterEach(() => {
      utils.maybePostComment.mockReset()
    })

    describe('when feature not enabled', () => {
      beforeEach(done => {
        bumper.config.isEnabled.mockReturnValue(false)
        const link = 'https://github.com/ciena-blueplanet/pr-bumper#featurescoverage'
        errorMsg = `Code coverage feature not enabled!\nSee ${link} for configuration info.`
        bumper.checkCoverage()
          .then(resp => {
            result = resp
          })
          .catch(err => {
            error = err
          })

        setTimeout(() => {
          done()
        }, 0)
      })

      it('should not resolve', () => {
        expect(result).toBe(null)
      })

      it('should maybe post a comment', () => {
        expect(utils.maybePostComment).toHaveBeenCalledWith(bumper.config, bumper.vcs, errorMsg, true)
      })

      it('should reject with an error', () => {
        expect(error).toBe(errorMsg)
      })
    })

    describe('when baseline coverage is not a number', () => {
      beforeEach(done => {
        bumper.config.isEnabled.mockReturnValue(true)
        __.set(bumper.config, 'computed.baselineCoverage', '85.93')
        const link = 'https://github.com/ciena-blueplanet/pr-bumper#featurescoverage'
        errorMsg = `Baseline coverage is not a number!\nSee ${link} for configuration info.`

        bumper.checkCoverage()
          .then(resp => {
            result = resp
          })
          .catch(err => {
            error = err
          })

        setTimeout(() => {
          done()
        }, 0)
      })

      it('should not resolve', () => {
        expect(result).toBe(null)
      })

      it('should maybe post a comment', () => {
        expect(utils.maybePostComment).toHaveBeenCalledWith(bumper.config, bumper.vcs, errorMsg, true)
      })

      it('should reject with an error', () => {
        expect(error).toBe(errorMsg)
      })
    })

    describe('when no current coverage found', () => {
      beforeEach(done => {
        bumper.config.isEnabled.mockReturnValue(true)
        __.set(bumper.config, 'computed.baselineCoverage', 85.93)
        utils.getCurrentCoverage.mockReturnValue(-1)
        const link = 'https://github.com/ciena-blueplanet/pr-bumper#featurescoverage'
        errorMsg = `No current coverage info found!\nSee ${link} for configuration info.`

        bumper.checkCoverage()
          .then(resp => {
            result = resp
          })
          .catch(err => {
            error = err
          })

        setTimeout(() => {
          done()
        }, 0)
      })

      afterEach(() => {
        utils.getCurrentCoverage.mockReset()
      })

      it('should not resolve', () => {
        expect(result).toBe(null)
      })

      it('should look up current coverage', () => {
        expect(utils.getCurrentCoverage).toHaveBeenCalledWith(bumper.config)
      })

      it('should maybe post a comment', () => {
        expect(utils.maybePostComment).toHaveBeenCalledWith(bumper.config, bumper.vcs, errorMsg, true)
      })

      it('should reject with an error', () => {
        expect(error).toBe(errorMsg)
      })
    })

    describe('when coverage drops', () => {
      beforeEach(done => {
        bumper.config.isEnabled.mockReturnValue(true)
        __.set(bumper.config, 'computed.baselineCoverage', 85.93)
        utils.getCurrentCoverage.mockReturnValue(84.99)
        errorMsg = 'Code Coverage: `84.99%` (dropped `0.94%` from `85.93%`)'

        bumper.checkCoverage()
          .then(resp => {
            result = resp
          })
          .catch(err => {
            error = err
          })

        setTimeout(() => {
          done()
        }, 0)
      })

      afterEach(() => {
        utils.getCurrentCoverage.mockReset()
      })

      it('should not resolve', () => {
        expect(result).toBe(null)
      })

      it('should look up current coverage', () => {
        expect(utils.getCurrentCoverage).toHaveBeenCalledWith(bumper.config)
      })

      it('should maybe post a comment', () => {
        expect(utils.maybePostComment).toHaveBeenCalledWith(bumper.config, bumper.vcs, errorMsg)
      })

      it('should reject with an error', () => {
        expect(error).toBe(errorMsg)
      })
    })

    describe('when coverage stays the same', () => {
      let msg

      beforeEach(done => {
        bumper.config.isEnabled.mockReturnValue(true)
        __.set(bumper.config, 'computed.baselineCoverage', 85.93)
        utils.getCurrentCoverage.mockReturnValue(85.93)
        msg = 'Code Coverage: `85.93%` (no change)'

        bumper.checkCoverage()
          .then(resp => {
            result = resp
          })
          .catch(err => {
            error = err
          })

        setTimeout(() => {
          done()
        }, 0)
      })

      afterEach(() => {
        utils.getCurrentCoverage.mockReset()
      })

      it('should resolve', () => {
        expect(result).toBe(undefined)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })

      it('should look up current coverage', () => {
        expect(utils.getCurrentCoverage).toHaveBeenCalledWith(bumper.config)
      })

      it('should maybe post a comment', () => {
        expect(utils.maybePostComment).toHaveBeenCalledWith(bumper.config, bumper.vcs, msg)
      })

      it('should log a message', () => {
        expect(logger.log).toHaveBeenCalledWith(msg, true)
      })
    })

    describe('when coverage increases', () => {
      let msg

      beforeEach(done => {
        bumper.config.isEnabled.mockReturnValue(true)
        __.set(bumper.config, 'computed.baselineCoverage', 85.93)
        utils.getCurrentCoverage.mockReturnValue(88.01)
        msg = 'Code Coverage: `88.01%` (increased `2.08%` from `85.93%`)'

        bumper.checkCoverage()
          .then(resp => {
            result = resp
          })
          .catch(err => {
            error = err
          })

        setTimeout(() => {
          done()
        }, 0)
      })

      afterEach(() => {
        utils.getCurrentCoverage.mockReset()
      })

      it('should resolve', () => {
        expect(result).toBe(undefined)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })

      it('should look up current coverage', () => {
        expect(utils.getCurrentCoverage).toHaveBeenCalledWith(bumper.config)
      })

      it('should maybe post a comment', () => {
        expect(utils.maybePostComment).toHaveBeenCalledWith(bumper.config, bumper.vcs, msg)
      })

      it('should log a message', () => {
        expect(logger.log).toHaveBeenCalledWith(msg, true)
      })
    })
  })

  describe('.bump()', () => {
    let result, info, error

    beforeEach(() => {
      result = null
      error = null
      bumper.config.foo = 'bar'
      bumper.vcs = {foo: 'bar'}
      bumper.ci = {push () {}, getLastCommitMsg: jest.fn()}
      info = {scope: 'minor', changelog: '', version: '1.2.0'}
      jest.spyOn(bumper, '_getMergedPrInfo').mockReturnValue(Promise.resolve(info))
      jest.spyOn(bumper, '_maybeBumpVersion').mockReturnValue(Promise.resolve(info))
      jest.spyOn(bumper, '_maybeCommitChanges').mockReturnValue(Promise.resolve(info))
      jest.spyOn(bumper, '_maybeCreateTag').mockReturnValue(Promise.resolve(info))
      jest.spyOn(bumper, '_maybeGenerateDependencyComplianceReport').mockReturnValue(Promise.resolve(info))
      jest.spyOn(bumper, '_maybeGenerateDependencySnapshot').mockReturnValue(Promise.resolve(info))
      jest.spyOn(bumper, '_maybePrependChangelog').mockReturnValue(Promise.resolve(info))
      jest.spyOn(bumper, '_maybePushChanges').mockReturnValue(Promise.resolve('pushed'))
      jest.spyOn(bumper, '_maybeUpdateBaselineCoverage').mockReturnValue(Promise.resolve(info))
    })

    afterEach(() => {
      bumper._getMergedPrInfo.mockRestore()
      bumper._maybeBumpVersion.mockRestore()
      bumper._maybeCommitChanges.mockRestore()
      bumper._maybeCreateTag.mockRestore()
      bumper._maybeGenerateDependencyComplianceReport.mockRestore()
      bumper._maybeGenerateDependencySnapshot.mockRestore()
      bumper._maybePrependChangelog.mockRestore()
      bumper._maybePushChanges.mockRestore()
      bumper._maybeUpdateBaselineCoverage.mockRestore()
    })

    describe('when a merge build', () => {
      beforeEach(done => {
        bumper.ci.getLastCommitMsg.mockReturnValue(Promise.resolve('foo bar'))
        bumper.bump()
          .then(res => {
            result = res
          })
          .catch(err => {
            error = err
          })
          .finally(() => {
            done()
          })
      })

      it('should get the merged pr info', () => {
        expect(bumper._getMergedPrInfo).toHaveBeenCalledTimes(1)
      })

      it('should maybe bump the version', () => {
        expect(bumper._maybeBumpVersion).toHaveBeenCalledWith(info, 'package.json')
      })

      it('should maybe prepend the changelog', () => {
        expect(bumper._maybePrependChangelog).toHaveBeenCalledWith(info)
      })

      it('should maybe generate the dependency snapshot', () => {
        expect(bumper._maybeGenerateDependencySnapshot).toHaveBeenCalledWith(info)
      })

      it('should maybe update baseline coverage', () => {
        expect(bumper._maybeUpdateBaselineCoverage).toHaveBeenCalledWith(info)
      })

      it('should maybe commit the change', () => {
        expect(bumper._maybeCommitChanges).toHaveBeenCalledWith(info)
      })

      it('should maybe create the tag', () => {
        expect(bumper._maybeCreateTag).toHaveBeenCalledWith(info)
      })

      it('should maybe run the dependencies', () => {
        expect(bumper._maybeGenerateDependencyComplianceReport).toHaveBeenCalledWith(info)
      })

      it('should maybe push the changes', () => {
        expect(bumper._maybePushChanges).toHaveBeenCalledWith(info)
      })

      it('should resolve with the result of the ci.push()', () => {
        expect(result).toBe('pushed')
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })
    })

    describe(`when last commit was from ${pkgJson.name}`, () => {
      beforeEach(done => {
        bumper.ci.getLastCommitMsg.mockReturnValue(Promise.resolve(`[${pkgJson.name}] Fizz bang`))
        bumper.bump()
          .then(res => {
            result = res
          })
          .catch(err => {
            error = err
          })
          .finally(() => {
            done()
          })
      })

      it('should not lookup merged PR info', () => {
        expect(bumper._getMergedPrInfo).toHaveBeenCalledTimes(0)
      })

      it('should not maybe bump version', () => {
        expect(bumper._maybeBumpVersion).toHaveBeenCalledTimes(0)
      })

      it('should not maybe prepend changelog', () => {
        expect(bumper._maybePrependChangelog).toHaveBeenCalledTimes(0)
      })

      it('should not maybe generate a dependency snapshot', () => {
        expect(bumper._maybeGenerateDependencySnapshot).toHaveBeenCalledTimes(0)
      })

      it('should not maybe calcualte dependencies', () => {
        expect(bumper._maybeGenerateDependencyComplianceReport).toHaveBeenCalledTimes(0)
      })

      it('should not maybe update baseline coverage', () => {
        expect(bumper._maybeUpdateBaselineCoverage).toHaveBeenCalledTimes(0)
      })

      it('should not maybe commit changes', () => {
        expect(bumper._maybeCommitChanges).toHaveBeenCalledTimes(0)
      })

      it('should not maybe create a tag', () => {
        expect(bumper._maybeCreateTag).toHaveBeenCalledTimes(0)
      })

      it('should not maybe push commit', () => {
        expect(bumper._maybePushChanges).toHaveBeenCalledTimes(0)
      })

      it('should not resolve', () => {
        expect(result).toBe(null)
      })

      it('should reject with a Cancel', () => {
        expect(error).toBeInstanceOf(Bumper.Cancel)
      })

      it('should reject with proper message', () => {
        expect(error.message).toBe(`Skipping bump on ${pkgJson.name} commit.`)
      })
    })

    describe('when not a merge build', () => {
      beforeEach(done => {
        __.set(bumper.config, 'computed.ci.isPr', true)
        bumper.bump()
          .then(res => {
            result = res
          })
          .catch(err => {
            error = err
          })
          .finally(() => {
            done()
          })
      })

      it('should log that non merge builds are skipped', () => {
        expect(logger.log).toHaveBeenCalledWith('Not a merge build, skipping bump')
      })

      it('should not lookup merged PR info', () => {
        expect(bumper._getMergedPrInfo).toHaveBeenCalledTimes(0)
      })

      it('should not maybe bump version', () => {
        expect(bumper._maybeBumpVersion).toHaveBeenCalledTimes(0)
      })

      it('should not maybe prepend changelog', () => {
        expect(bumper._maybePrependChangelog).toHaveBeenCalledTimes(0)
      })

      it('should not maybe generate a dependency snapshot', () => {
        expect(bumper._maybeGenerateDependencySnapshot).toHaveBeenCalledTimes(0)
      })

      it('should not maybe calcualte dependencies', () => {
        expect(bumper._maybeGenerateDependencyComplianceReport).toHaveBeenCalledTimes(0)
      })

      it('should not maybe update baseline coverage', () => {
        expect(bumper._maybeUpdateBaselineCoverage).toHaveBeenCalledTimes(0)
      })

      it('should not maybe commit changes', () => {
        expect(bumper._maybeCommitChanges).toHaveBeenCalledTimes(0)
      })

      it('should not maybe create a tag', () => {
        expect(bumper._maybeCreateTag).toHaveBeenCalledTimes(0)
      })

      it('should not maybe push commit', () => {
        expect(bumper._maybePushChanges).toHaveBeenCalledTimes(0)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })
    })
  })

  describe('._getLastPr()', () => {
    let getPrResolver, resolution, rejection, promise

    beforeEach(() => {
      getPrResolver = {}
      const getPrPromise = new Promise((resolve, reject) => {
        getPrResolver.resolve = resolve
        getPrResolver.reject = reject
      })
      bumper.vcs = {
        getPr: jest.fn().mockReturnValue(getPrPromise)
      }

      // actual results of git log -10 --oneline on pr-bumper repo
      const gitLog =
        '98a148c Added some more tests, just a few more to go\n' +
        '1b1bd97 Added some real unit tests\n' +
        'edf85e0 Merge pull request #30 from job13er/remove-newline\n' +
        'fa066f2 Removed newline from parsed PR number\n' +
        'fc416cc Merge pull request #29 from job13er/make-bumping-more-robust\n' +
        '67db358 Fix for #26 by reading PR # from git commit\n' +
        '4a61a20 Automated version bump\n' +
        '7db44e1 Merge pull request #24 from sandersky/master\n' +
        'f571451 add pullapprove config\n' +
        '4398a26 address PR concerns\n'

      exec.mockReturnValue(Promise.resolve(gitLog))
      promise = bumper._getLastPr()
        .then(pr => {
          resolution = pr
          return pr
        })
        .catch(err => {
          rejection = err
          throw err
        })
    })

    it('should call git log', () => {
      expect(exec).toHaveBeenCalledWith('git log -10 --oneline')
    })

    describe('when getPr succeeds', () => {
      beforeEach(() => {
        getPrResolver.resolve('the-pr')
        return promise
      })

      it('should parse out the PR number from the git log and passes it to vcs.getPr()', () => {
        expect(bumper.vcs.getPr).toHaveBeenCalledWith('30')
      })

      it('should resolve with the pr', () => {
        expect(resolution).toBe('the-pr')
      })
    })

    describe('when getPr fails', () => {
      beforeEach(done => {
        getPrResolver.reject('the-error')
        promise.catch(() => {
          done()
        })
      })

      it('should parse out the PR number from the git log and passes it to vcs.getPr()', () => {
        expect(bumper.vcs.getPr).toHaveBeenCalledWith('30')
      })

      it('should reject with the error', () => {
        expect(rejection).toBe('the-error')
      })
    })
  })

  describe('._getMergedPrInfo()', () => {
    ;['major', 'minor', 'patch'].forEach(scope => {
      describe(`when scope is ${scope}`, () => {
        let result

        beforeEach(() => {
          bumper.config = {
            features: {
              maxScope: {
                value: 'minor'
              }
            },
            foo: 'bar',
            isEnabled: jest.fn()
          }
          bumper.vcs = {bar: 'baz'}

          jest.spyOn(bumper, '_getLastPr').mockReturnValue(Promise.resolve('the-pr'))
          utils.getChangelogForPr.mockReturnValue('my-changelog')
          utils.getScopeForPr.mockReturnValue(scope)
        })

        afterEach(() => {
          bumper._getLastPr.mockRestore()
          utils.getChangelogForPr.mockReset()
          utils.getScopeForPr.mockReset()
        })

        describe('when maxScope is enabled', () => {
          beforeEach(() => {
            bumper.config.isEnabled.mockImplementation(name => name === 'maxScope')
          })

          describe('when changelog feature is enabled', () => {
            beforeEach(() => {
              bumper.config.isEnabled.mockImplementation(name => ['changelog', 'maxScope'].indexOf(name) !== -1)
              return bumper._getMergedPrInfo().then(res => {
                result = res
              })
            })

            it('should get the last PR to be merged', () => {
              expect(bumper._getLastPr).toHaveBeenCalledTimes(1)
            })

            it('should gets the scope for the given pr', () => {
              expect(utils.getScopeForPr).toHaveBeenCalledWith('the-pr', 'minor')
            })

            it('should get the changelog for the given pr', () => {
              expect(utils.getChangelogForPr).toHaveBeenCalledWith('the-pr')
            })

            it('should resolve with the info', () => {
              expect(result).toEqual({changelog: 'my-changelog', modifiedFiles: [], scope})
            })
          })

          describe('when changelog feature is not enabled', () => {
            beforeEach(() => {
              return bumper._getMergedPrInfo().then(res => {
                result = res
              })
            })

            it('should get the last PR to be merged', () => {
              expect(bumper._getLastPr).toHaveBeenCalledTimes(1)
            })

            it('should gets the scope for the given pr', () => {
              expect(utils.getScopeForPr).toHaveBeenCalledWith('the-pr', 'minor')
            })

            it('should not get the changelog for the given pr', () => {
              expect(utils.getChangelogForPr).toHaveBeenCalledTimes(0)
            })

            it('should resolve with the info', () => {
              expect(result).toEqual({changelog: '', modifiedFiles: [], scope})
            })
          })
        })

        describe('when maxScope is disabled', () => {
          beforeEach(() => {
            bumper.config.isEnabled.mockReturnValue(false)
          })

          describe('when changelog feature is enabled', () => {
            beforeEach(() => {
              bumper.config.isEnabled.mockImplementation(name => name === 'changelog')
              return bumper._getMergedPrInfo().then(res => {
                result = res
              })
            })

            it('should get the last PR to be merged', () => {
              expect(bumper._getLastPr).toHaveBeenCalledTimes(1)
            })

            it('should gets the scope for the given pr', () => {
              expect(utils.getScopeForPr).toHaveBeenCalledWith('the-pr', 'major')
            })

            it('should get the changelog for the given pr', () => {
              expect(utils.getChangelogForPr).toHaveBeenCalledWith('the-pr')
            })

            it('should resolve with the info', () => {
              expect(result).toEqual({changelog: 'my-changelog', modifiedFiles: [], scope})
            })
          })

          describe('when changelog feature is not enabled', () => {
            beforeEach(() => {
              return bumper._getMergedPrInfo().then(res => {
                result = res
              })
            })

            it('should get the last PR to be merged', () => {
              expect(bumper._getLastPr).toHaveBeenCalledTimes(1)
            })

            it('should gets the scope for the given pr', () => {
              expect(utils.getScopeForPr).toHaveBeenCalledWith('the-pr', 'major')
            })

            it('should not get the changelog for the given pr', () => {
              expect(utils.getChangelogForPr).toHaveBeenCalledTimes(0)
            })

            it('should resolve with the info', () => {
              expect(result).toEqual({changelog: '', modifiedFiles: [], scope})
            })
          })
        })
      })
    })

    describe('when scope is none', () => {
      let result

      beforeEach(() => {
        bumper.config = {foo: 'bar', isEnabled: jest.fn()}
        bumper.vcs = {bar: 'baz'}

        jest.spyOn(bumper, '_getLastPr').mockReturnValue(Promise.resolve('the-pr'))
        utils.getScopeForPr.mockReturnValue('none')
        utils.getChangelogForPr.mockReturnValue('my-changelog')
      })

      afterEach(() => {
        bumper._getLastPr.mockRestore()
        utils.getScopeForPr.mockReset()
        utils.getChangelogForPr.mockReset()
      })

      describe('and changelog feature is enabled', () => {
        beforeEach(() => {
          bumper.config.isEnabled.mockImplementation(name => name === 'changelog')
          return bumper._getMergedPrInfo().then(res => {
            result = res
          })
        })

        it('should get the last PR to be merged', () => {
          expect(bumper._getLastPr).toHaveBeenCalledTimes(1)
        })

        it('should gets the scope for the given pr', () => {
          expect(utils.getScopeForPr).toHaveBeenCalledWith('the-pr', 'major')
        })

        it('should not get the changelog for the given pr', () => {
          expect(utils.getChangelogForPr).toHaveBeenCalledTimes(0)
        })

        it('should resolve with the info', () => {
          expect(result).toEqual({changelog: '', modifiedFiles: [], scope: 'none'})
        })
      })

      describe('and changelog feature is not enabled', () => {
        beforeEach(() => {
          bumper.config.isEnabled.mockReturnValue(false)
          return bumper._getMergedPrInfo().then(res => {
            result = res
          })
        })

        it('should get the last PR to be merged', () => {
          expect(bumper._getLastPr).toHaveBeenCalledTimes(1)
        })

        it('should gets the scope for the given pr', () => {
          expect(utils.getScopeForPr).toHaveBeenCalledWith('the-pr', 'major')
        })

        it('should not get the changelog for the given pr', () => {
          expect(utils.getChangelogForPr).toHaveBeenCalledTimes(0)
        })

        it('should resolve with the info', () => {
          expect(result).toEqual({changelog: '', modifiedFiles: [], scope: 'none'})
        })
      })
    })
  })

  describe('._getOpenPrInfo()', () => {
    let result

    beforeEach(() => {
      bumper.config = {
        foo: 'bar',
        computed: {
          ci: {
            prNumber: '123'
          }
        },
        isEnabled: jest.fn()
      }
      bumper.vcs = {
        getPr: jest.fn().mockReturnValue(Promise.resolve('the-pr'))
      }
      utils.getChangelogForPr.mockReturnValue('the-changelog')
      utils.getScopeForPr.mockReturnValue('patch')
      utils.maybePostCommentOnError
        .mockReturnValueOnce({
          pr: 'the-pr',
          scope: 'the-scope'
        })
        .mockReturnValueOnce({
          changelog: 'the-changelog',
          scope: 'the-scope'
        })
    })

    afterEach(() => {
      utils.getScopeForPr.mockReset()
      utils.getChangelogForPr.mockReset()
      utils.maybePostCommentOnError.mockReset()
    })

    describe('when optional features are disabled', () => {
      beforeEach(() => {
        bumper.config.isEnabled.mockReturnValue(false)
        return bumper._getOpenPrInfo().then(res => {
          result = res
        })
      })

      it('should fetch the PR', () => {
        expect(bumper.vcs.getPr).toHaveBeenCalledWith('123')
      })

      it('should call maybePostCommentOnError() once', () => {
        expect(utils.maybePostCommentOnError).toHaveBeenCalledTimes(1)
      })

      it('should not look up the scope of the PR', () => {
        expect(utils.getScopeForPr).toHaveBeenCalledTimes(0)
      })

      it('should not look up the changelog of the PR', () => {
        expect(utils.getChangelogForPr).toHaveBeenCalledTimes(0)
      })

      it('should resolve with the info', () => {
        expect(result).toEqual({
          changelog: '',
          scope: 'the-scope'
        })
      })

      describe('the first call to maybePostCommentOnError()', () => {
        let args

        beforeEach(() => {
          args = utils.maybePostCommentOnError.mock.calls[0]
        })

        it('should pass in the config', () => {
          expect(args[0]).toBe(bumper.config)
        })

        it('should pass in the vcs', () => {
          expect(args[1]).toBe(bumper.vcs)
        })

        describe('when the wrapped function is called', () => {
          let ret

          beforeEach(() => {
            ret = args[2]()
          })

          it('should get the scope', () => {
            expect(utils.getScopeForPr).toHaveBeenCalledWith('the-pr', 'major')
          })

          it('should return the pr and scope', () => {
            expect(ret).toEqual({
              pr: 'the-pr',
              scope: 'patch'
            })
          })
        })
      })
    })

    describe('when maxScope is enabled', () => {
      beforeEach(() => {
        bumper.config.isEnabled.mockImplementation(name => name === 'maxScope')
        __.set(bumper.config, 'features.maxScope.value', 'minor')
        return bumper._getOpenPrInfo().then(res => {
          result = res
        })
      })

      it('should fetch the PR', () => {
        expect(bumper.vcs.getPr).toHaveBeenCalledWith('123')
      })

      it('should call maybePostCommentOnError() once', () => {
        expect(utils.maybePostCommentOnError).toHaveBeenCalledTimes(1)
      })

      it('should not look up the scope of the PR', () => {
        expect(utils.getScopeForPr).toHaveBeenCalledTimes(0)
      })

      it('should not look up the changelog of the PR', () => {
        expect(utils.getChangelogForPr).toHaveBeenCalledTimes(0)
      })

      it('should resolve with the info', () => {
        expect(result).toEqual({
          changelog: '',
          scope: 'the-scope'
        })
      })

      describe('the first call to maybePostCommentOnError()', () => {
        let args

        beforeEach(() => {
          args = utils.maybePostCommentOnError.mock.calls[0]
        })

        it('should pass in the config', () => {
          expect(args[0]).toBe(bumper.config)
        })

        it('should pass in the vcs', () => {
          expect(args[1]).toBe(bumper.vcs)
        })

        describe('when the wrapped function is called', () => {
          let ret

          beforeEach(() => {
            ret = args[2]()
          })

          it('should get the scope', () => {
            expect(utils.getScopeForPr).toHaveBeenCalledWith('the-pr', 'minor')
          })

          it('should return the pr and scope', () => {
            expect(ret).toEqual({
              pr: 'the-pr',
              scope: 'patch'
            })
          })
        })
      })
    })

    describe('when changelog is enabled', () => {
      beforeEach(() => {
        bumper.config.isEnabled.mockImplementation(name => name === 'changelog')
        return bumper._getOpenPrInfo().then(res => {
          result = res
        })
      })

      it('should fetch the PR', () => {
        expect(bumper.vcs.getPr).toHaveBeenCalledWith('123')
      })

      it('should call maybePostCommentOnError() twice', () => {
        expect(utils.maybePostCommentOnError).toHaveBeenCalledTimes(2)
      })

      it('should not look up the scope of the PR', () => {
        expect(utils.getScopeForPr).toHaveBeenCalledTimes(0)
      })

      it('should not look up the changelog of the PR', () => {
        expect(utils.getChangelogForPr).toHaveBeenCalledTimes(0)
      })

      it('should resolve with the info', () => {
        expect(result).toEqual({
          changelog: 'the-changelog',
          scope: 'the-scope'
        })
      })

      describe('the first call to maybePostCommentOnError()', () => {
        let args

        beforeEach(() => {
          args = utils.maybePostCommentOnError.mock.calls[0]
        })

        it('should pass in the config', () => {
          expect(args[0]).toBe(bumper.config)
        })

        it('should pass in the vcs', () => {
          expect(args[1]).toBe(bumper.vcs)
        })

        describe('when the wrapped function is called', () => {
          let ret

          beforeEach(() => {
            ret = args[2]()
          })

          it('should get the scope', () => {
            expect(utils.getScopeForPr).toHaveBeenCalledWith('the-pr', 'major')
          })

          it('should return the pr and scope', () => {
            expect(ret).toEqual({
              pr: 'the-pr',
              scope: 'patch'
            })
          })
        })
      })

      describe('the second call to maybePostCommentOnError()', () => {
        let args

        beforeEach(() => {
          args = utils.maybePostCommentOnError.mock.calls[1]
        })

        it('should pass in the config', () => {
          expect(args[0]).toBe(bumper.config)
        })

        it('should pass in the vcs', () => {
          expect(args[1]).toBe(bumper.vcs)
        })

        describe('when the wrapped function is called', () => {
          let ret
          beforeEach(() => {
            ret = args[2]()
          })

          it('should get the changelog', () => {
            expect(utils.getChangelogForPr).toHaveBeenCalledWith('the-pr')
          })

          it('should return the changelog and scope', () => {
            expect(ret).toEqual({
              changelog: 'the-changelog',
              scope: 'the-scope'
            })
          })
        })
      })
    })
  })

  describe('._maybeBumpVersion()', () => {
    const ctx = {}

    beforeEach(() => {
      ctx.bumper = bumper

      const original = path.join(__dirname, '_package.json')
      const otherOriginal = path.join(__dirname, '_package-with-pre-release.json')
      return unmockedExec(`cp ${original} _package.json`)
        .then(() => {
          return unmockedExec(`cp ${otherOriginal} _package-with-pre-release.json`)
        })
    })

    afterEach(() => {
      return unmockedExec('rm -f _package.json _package-with-pre-release.json')
    })

    testMaybeBumpVersion(ctx, '_package.json', 'none', '1.2.3')
    testMaybeBumpVersion(ctx, '_package.json', 'patch', '1.2.4')
    testMaybeBumpVersion(ctx, '_package.json', 'minor', '1.3.0')
    testMaybeBumpVersion(ctx, '_package.json', 'major', '2.0.0')

    testMaybeBumpVersion(ctx, '_package-with-pre-release.json', 'none', '1.2.3-alpha.4')
    testMaybeBumpVersion(ctx, '_package-with-pre-release.json', 'patch', '1.2.3-alpha.5')

    describe('an invalid scope', () => {
      let info
      beforeEach(() => {
        info = {scope: 'foo'}
      })

      it('should throw an Error', () => {
        expect(() => {
          bumper._maybeBumpVersion(info, '_package.json')
        }).toThrow('Invalid scope [foo]')
      })
    })
  })

  describe('._maybeCommitChanges()', () => {
    let info, result, error

    beforeEach(() => {
      info = {
        changelog: 'stuff changed',
        modifiedFiles: [],
        scope: 'patch'
      }
      __.set(bumper.config, 'computed.ci.buildNumber', '12345')

      bumper.ci = {
        add: jest.fn().mockReturnValue(Promise.resolve()),
        commit: jest.fn().mockReturnValue(Promise.resolve()),
        setupGitEnv: jest.fn().mockReturnValue(Promise.resolve())
      }
    })

    describe('when no files were modified', () => {
      beforeEach(done => {
        result = error = null
        bumper._maybeCommitChanges(info)
          .then(r => {
            result = r
          })
          .catch(e => {
            error = e
          })
          .finally(() => {
            done()
          })
      })

      it('should log info about skipping', () => {
        expect(logger.log).toHaveBeenCalledWith('Skipping commit because no files were changed.')
      })

      it('should not set up the git env', () => {
        expect(bumper.ci.setupGitEnv).toHaveBeenCalledTimes(0)
      })

      it('should not add any files', () => {
        expect(bumper.ci.add).toHaveBeenCalledTimes(0)
      })

      it('should not commit any files', () => {
        expect(bumper.ci.commit).toHaveBeenCalledTimes(0)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })

    describe('when files were modified', () => {
      beforeEach(done => {
        info.modifiedFiles = [
          'fizz',
          'bang'
        ]
        result = error = null
        bumper._maybeCommitChanges(info)
          .then(r => {
            result = r
          })
          .catch(e => {
            error = e
          })
          .finally(() => {
            done()
          })
      })

      it('should not log info about skipping', () => {
        expect(logger.log).toHaveBeenCalledTimes(0)
      })

      it('should set up the git env', () => {
        expect(bumper.ci.setupGitEnv).toHaveBeenCalledTimes(1)
      })

      it('should add the rightfiles', () => {
        expect(bumper.ci.add).toHaveBeenCalledWith(['fizz', 'bang'])
      })

      it('should commit with version bump message', () => {
        const msg = `[${pkgJson.name}] Automated version bump`
        const descr = 'From CI build 12345'
        expect(bumper.ci.commit).toHaveBeenCalledWith(msg, descr)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })

    describe('when files were modified, and none scope', () => {
      beforeEach(done => {
        info.scope = 'none'
        info.modifiedFiles = [
          'fizz',
          'bang'
        ]
        result = error = null
        bumper._maybeCommitChanges(info)
          .then(r => {
            result = r
          })
          .catch(e => {
            error = e
          })
          .finally(() => {
            done()
          })
      })

      it('should not log info about skipping', () => {
        expect(logger.log).toHaveBeenCalledTimes(0)
      })

      it('should set up the git env', () => {
        expect(bumper.ci.setupGitEnv).toHaveBeenCalledTimes(1)
      })

      it('should add the rightfiles', () => {
        expect(bumper.ci.add).toHaveBeenCalledWith(['fizz', 'bang'])
      })

      it('should commit with coverage message', () => {
        const msg = `[${pkgJson.name}] Automated code coverage update`
        const descr = 'From CI build 12345'
        expect(bumper.ci.commit).toHaveBeenCalledWith(msg, descr)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })
  })

  describe('._maybeCreateTag()', () => {
    let result, info

    beforeEach(() => {
      info = {
        version: '1.2.3'
      }
      __.set(bumper.config, 'computed.ci.buildNumber', '12345')
      bumper.ci = {
        tag: jest.fn().mockReturnValue(Promise.resolve('tagged'))
      }
      exec.mockReturnValue(Promise.resolve())
    })

    describe('when scope is not "none"', () => {
      beforeEach(() => {
        return bumper._maybeCreateTag(info)
          .then(res => {
            result = res
          })
      })

      it('should create a tag', () => {
        expect(bumper.ci.tag).toHaveBeenCalledWith('v1.2.3', 'Generated tag from CI build 12345')
      })

      it('should resolve with the result of the tag', () => {
        expect(result).toBe(info)
      })
    })

    describe('when scope is "none"', () => {
      beforeEach(() => {
        info.scope = 'none'
        return bumper._maybeCreateTag(info)
          .then(res => {
            result = res
          })
      })

      it('should not create a tag', () => {
        expect(bumper.ci.tag).toHaveBeenCalledTimes(0)
      })

      it('should resolve with the result of the tag', () => {
        expect(result).toBe(info)
      })
    })
  })

  describe('._maybeGenerateDependencyComplianceReport()', () => {
    let result, info

    beforeEach(() => {
      info = {
        modifiedFiles: [],
        scope: 'none'
      }
    })

    describe('when feature is disabled', () => {
      beforeEach(() => {
        bumper.config.isEnabled.mockReturnValue(false)
        return bumper._maybeGenerateDependencyComplianceReport(info)
          .then(r => {
            result = r
          })
      })

      it('should log info about skipping b/c of config', () => {
        const msg = 'Skipping generating dependency compliance report because of config option.'
        expect(logger.log).toHaveBeenCalledWith(msg)
      })

      it('should not generate dependencies', () => {
        expect(run).toHaveBeenCalledTimes(0)
      })

      it('should return a promise resolving with info', () => {
        expect(result).toBe(info)
      })
    })

    describe('when feature is enabled, but scope is "none"', () => {
      beforeEach(() => {
        bumper.config.isEnabled.mockImplementation(name => name === 'compliance')
        __.set(bumper.config, 'features.compliance.output.directory', 'blackduck/')
        return bumper._maybeGenerateDependencyComplianceReport(info)
          .then(r => {
            result = r
          })
      })

      it('should log info about skipping b/c of scope', () => {
        const msg = 'Skipping generating dependency compliance report because of "none" scope.'
        expect(logger.log).toHaveBeenCalledWith(msg)
      })

      it('should not generate dependencies', () => {
        expect(run).toHaveBeenCalledTimes(0)
      })

      it('should return a promise resolving with info', () => {
        expect(result).toBe(info)
      })
    })

    describe('when feature is enabled, and scope is not "none"', () => {
      let cwd, globalPath

      beforeEach(() => {
        info.scope = 'patch'
        cwd = process.cwd()
        globalPath = path.join(cwd, 'blackduck/')
        bumper.config.isEnabled.mockImplementation(name => name === 'compliance')
        __.set(bumper.config, 'features.compliance.output.directory', 'blackduck/')
        return bumper._maybeGenerateDependencyComplianceReport(info)
          .then(r => {
            result = r
          })
      })

      it('should not log anything', () => {
        expect(logger.log).toHaveBeenCalledTimes(0)
      })

      it('should generate dependencies', () => {
        expect(run).toHaveBeenCalledWith(cwd, globalPath, bumper.config)
      })

      it('should add "blackduck/" to the list of files modified', () => {
        expect(info.modifiedFiles).toContain('blackduck/')
      })

      it('should return a promise resolving with info', () => {
        expect(result).toBe(info)
      })
    })
  })

  describe('._maybeGenerateDependencySnapshot()', () => {
    let ret, info

    beforeEach(() => {
      info = {
        modifiedFiles: [],
        scope: 'patch'
      }

      __.set(bumper.config, 'features.dependencies.snapshotFile', 'snapshot-file')
      exec
        // npm prune
        .mockImplementationOnce(() => Promise.resolve('prune-done'))
        // npm shrinkwrap --dev
        .mockImplementationOnce(() => Promise.resolve('shrinkwrap-done'))
        .mockReturnValue(Promise.resolve('move-done'))
    })

    describe('when feature is not enabled', () => {
      beforeEach(() => {
        bumper.config.isEnabled.mockReturnValue(false)
        return bumper._maybeGenerateDependencySnapshot(info)
          .then(resp => {
            ret = resp
          })
      })

      it('should log a message about why it is skipping', () => {
        const msg = 'Skipping generating dependency snapshot because of config option.'
        expect(logger.log).toHaveBeenCalledWith(msg)
      })

      it('should not prune node_modules so shrinkwrap will work', () => {
        expect(exec).not.toHaveBeenCalledWith('npm prune')
      })

      it('should not generate the dependency snapshot', () => {
        expect(exec).not.toHaveBeenCalledWith('npm shrinkwrap --dev')
      })

      it('should not add the dependencySnapshotFile to the list of modified files', () => {
        expect(info.modifiedFiles).toHaveLength(0)
      })

      it('should return the info', () => {
        expect(ret).toBe(info)
      })
    })

    describe('when feature is enabled, but scope is "none"', () => {
      beforeEach(() => {
        bumper.config.isEnabled.mockImplementation(name => name === 'dependencies')
        info.scope = 'none'
        return bumper._maybeGenerateDependencySnapshot(info)
          .then(resp => {
            ret = resp
          })
      })

      it('should log a message about why it is skipping', () => {
        const msg = 'Skipping generating dependency snapshot because of "none" scope.'
        expect(logger.log).toHaveBeenCalledWith(msg)
      })

      it('should not prune node_modules so shrinkwrap will work', () => {
        expect(exec).not.toHaveBeenCalledWith('npm prune')
      })

      it('should not generate the dependency snapshot', () => {
        expect(exec).not.toHaveBeenCalledWith('npm shrinkwrap --dev')
      })

      it('should not add the dependencySnapshotFile to the list of modified files', () => {
        expect(info.modifiedFiles).toHaveLength(0)
      })

      it('should return the info', () => {
        expect(ret).toBe(info)
      })
    })

    describe('when features is enabled and scope is not "none"', () => {
      beforeEach(() => {
        bumper.config.isEnabled.mockImplementation(name => name === 'dependencies')
        return bumper._maybeGenerateDependencySnapshot(info)
          .then(resp => {
            ret = resp
          })
      })

      it('should prune node_modules so shrinkwrap will work', () => {
        expect(exec).toHaveBeenCalledWith('npm prune')
      })

      it('should generate the dependency snapshot', () => {
        expect(exec).toHaveBeenCalledWith('npm shrinkwrap --dev')
      })

      it('should rename the dependency snapshot', () => {
        expect(exec).toHaveBeenCalledWith('mv npm-shrinkwrap.json snapshot-file')
      })

      it('should add the dependencySnapshotFile to the list of modified files', () => {
        expect(info.modifiedFiles).toContain('snapshot-file')
      })

      it('should return the info', () => {
        expect(ret).toBe(info)
      })
    })
  })

  describe('._maybePrependChangelog()', () => {
    let result, info

    beforeEach(() => {
      info = {
        changelog: 'the-changelog-content',
        scope: 'patch',
        modifiedFiles: [],
        version: '1.2.3'
      }
      __.set(bumper.config, 'features.changelog.file', 'the-changelog-file')
      prepend.mockReturnValue(Promise.resolve('return-value'))
    })

    describe('when feature is disabled', () => {
      beforeEach(() => {
        bumper.config.isEnabled.mockReturnValue(false)

        return bumper._maybePrependChangelog(info)
          .then(resp => {
            result = resp
          })
      })

      it('should log a message explaining why it is skipping', () => {
        const msg = 'Skipping prepending changelog because of config option.'
        expect(logger.log).toHaveBeenCalledWith(msg)
      })

      it('should not prepend the changelog', () => {
        expect(prepend).toHaveBeenCalledTimes(0)
      })

      it('should not add the changelog file to the modifiedFiles list', () => {
        expect(info.modifiedFiles).not.toContain('the-changelog-file')
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })

    describe('when feature is enabled, and scope is "none"', () => {
      beforeEach(() => {
        info.scope = 'none'
        delete info.version
        bumper.config.isEnabled.mockImplementation(name => name === 'changelog')

        return bumper._maybePrependChangelog(info)
          .then(resp => {
            result = resp
          })
      })

      it('should log a message explaining why it is skipping', () => {
        const msg = 'Skipping prepending changelog because of "none" scope.'
        expect(logger.log).toHaveBeenCalledWith(msg)
      })

      it('should not prepend the changelog', () => {
        expect(prepend).toHaveBeenCalledTimes(0)
      })

      it('should not add the changelog file to the modifiedFiles list', () => {
        expect(info.modifiedFiles).not.toContain('the-changelog-file')
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })

    describe('when feature is enabled and scope is not "none"', () => {
      beforeEach(() => {
        info.scope = 'patch'
        bumper.config.isEnabled.mockImplementation(name => name === 'changelog')
        bumper.config.changelogFile = 'the-changelog-file'

        return bumper._maybePrependChangelog(info)
          .then(resp => {
            result = resp
          })
      })

      it('should not log a message explaining why it is skipping', () => {
        expect(logger.log).toHaveBeenCalledTimes(0)
      })

      it('should prepend the changelog', () => {
        const now = new Date()
        const dateString = now.toISOString().split('T').slice(0, 1).join('')
        const data = `# ${info.version} (${dateString})\n${info.changelog}\n\n`
        expect(prepend).toHaveBeenCalledWith('the-changelog-file', data)
      })

      it('should add the changelog file to the modifiedFiles list', () => {
        expect(info.modifiedFiles).toContain('the-changelog-file')
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })
  })

  describe('_maybePushChanges()', () => {
    let result, info

    beforeEach(() => {
      info = {
        modifiedFiles: [],
        scope: 'none'
      }
      bumper.ci = {
        push: jest.fn().mockReturnValue(Promise.resolve('pushed'))
      }
    })

    describe('when nothing changed', () => {
      beforeEach(() => {
        return bumper._maybePushChanges(info)
          .then(r => {
            result = r
          })
      })

      it('should log a message about why it is skipping', () => {
        expect(logger.log).toHaveBeenCalledWith('Skipping push because nothing changed.')
      })

      it('should not push the change', () => {
        expect(bumper.ci.push).toHaveBeenCalledTimes(0)
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })

    describe('when something changed', () => {
      beforeEach(() => {
        info.modifiedFiles = ['package.json']
        return bumper._maybePushChanges(info)
          .then(r => {
            result = r
          })
      })

      it('should not log a message about why it is skipping', () => {
        expect(logger.log).toHaveBeenCalledTimes(0)
      })

      it('should push the change', () => {
        expect(bumper.ci.push).toHaveBeenCalledWith(bumper.vcs)
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })
    })
  })

  describe('_maybeUpdateBaselineCoverage()', () => {
    let info, _pkgJson, result, error

    beforeEach(() => {
      info = {
        modifiedFiles: [],
        scope: 'none'
      }

      writeFile.mockReturnValue(Promise.resolve('written'))
      utils.getCurrentCoverage.mockImplementation(() => {})
    })

    afterEach(() => {
      utils.getCurrentCoverage.mockReset()
    })

    describe('when feature is disabled', () => {
      beforeEach(done => {
        _pkgJson = {}
        readFile.mockReturnValue(Promise.resolve(JSON.stringify(_pkgJson, null, 2)))

        result = error = null
        bumper.config.isEnabled.mockReturnValue(false)
        bumper._maybeUpdateBaselineCoverage(info)
          .then(r => {
            result = r
          })
          .catch(e => {
            error = e
          })
          .finally(() => {
            done()
          })
      })

      it('should log a message about why it is not updating coverage', () => {
        const msg = 'Skipping updating baseline code coverage because of config option.'
        expect(logger.log).toHaveBeenCalledWith(msg)
      })

      it('should not lookup current coverage', () => {
        expect(utils.getCurrentCoverage).toHaveBeenCalledTimes(0)
      })

      it('should not read from a file', () => {
        expect(readFile).toHaveBeenCalledTimes(0)
      })

      it('should not write to a file', () => {
        expect(writeFile).toHaveBeenCalledTimes(0)
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })
    })

    describe('when no current coverage present', () => {
      beforeEach(done => {
        _pkgJson = {}
        readFile.mockReturnValue(Promise.resolve(JSON.stringify(_pkgJson, null, 2)))
        __.set(bumper.config, 'computed.baselineCoverage', 99.93)
        bumper.config.isEnabled.mockImplementation(name => name === 'coverage')
        utils.getCurrentCoverage.mockReturnValue(-1)

        result = error = null
        bumper._maybeUpdateBaselineCoverage(info)
          .then(r => {
            result = r
          })
          .catch(e => {
            error = e
          })
          .finally(() => {
            done()
          })
      })

      it('should lookup current coverage', () => {
        expect(utils.getCurrentCoverage).toHaveBeenCalledWith(bumper.config)
      })

      it('should not read from a file', () => {
        expect(readFile).toHaveBeenCalledTimes(0)
      })

      it('should not write to a file', () => {
        expect(writeFile).toHaveBeenCalledTimes(0)
      })

      it('should not add "package.json" to the list of modified files', () => {
        expect(info.modifiedFiles).not.toContain('package.json')
      })

      it('should not resolve', () => {
        expect(result).toBe(null)
      })

      it('should reject with an appropriate error', () => {
        const link = 'https://github.com/ciena-blueplanet/pr-bumper#featurescoverage'
        const msg = `No current coverage info found!\nSee ${link} for configuration info.`
        expect(error).toBe(msg)
      })
    })

    describe('when no baseline coverage present', () => {
      let location

      beforeEach(done => {
        _pkgJson = {
          foo: 'bar'
        }
        readFile.mockReturnValue(Promise.resolve(JSON.stringify(_pkgJson, null, 2)))
        location = path.join(process.cwd(), 'package.json')

        __.set(bumper.config, 'computed.baselineCoverage', 0)
        bumper.config.isEnabled.mockImplementation(name => name === 'coverage')
        utils.getCurrentCoverage.mockReturnValue(99.57)
        writeFile.mockReturnValue(Promise.resolve('written'))
        result = error = null
        bumper._maybeUpdateBaselineCoverage(info, _pkgJson)
          .then(r => {
            result = r
          })
          .catch(e => {
            error = e
          })
          .finally(() => {
            done()
          })
      })

      it('should lookup current coverage', () => {
        expect(utils.getCurrentCoverage).toHaveBeenCalledWith(bumper.config)
      })

      it('should read previous contents of the "package.json" file', () => {
        expect(readFile).toHaveBeenCalledWith(location, 'utf8')
      })

      it('should write new contents of the "package.json" file', () => {
        const newPkgJson = __.cloneDeep(_pkgJson)
        __.set(newPkgJson, 'pr-bumper.coverage', 99.57)
        expect(writeFile).toHaveBeenCalledWith(location, JSON.stringify(newPkgJson, null, 2))
      })

      it('should add "package.json" to the list of modified files', () => {
        expect(info.modifiedFiles).toContain('package.json')
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })
    })

    describe('when current coverage and baseline present', () => {
      let location

      beforeEach(done => {
        _pkgJson = {
          foo: 'bar',
          'pr-bumper': {
            coverage: 99.15
          }
        }
        readFile.mockReturnValue(Promise.resolve(JSON.stringify(_pkgJson, null, 2)))
        location = path.join(process.cwd(), 'package.json')

        __.set(bumper.config, 'computed.baselineCoverage', 99.15)
        bumper.config.isEnabled.mockImplementation(name => name === 'coverage')
        utils.getCurrentCoverage.mockReturnValue(99.57)
        writeFile.mockReturnValue(Promise.resolve('written'))
        result = error = null
        bumper._maybeUpdateBaselineCoverage(info, _pkgJson)
          .then(r => {
            result = r
          })
          .catch(e => {
            error = e
          })
          .finally(() => {
            done()
          })
      })

      it('should lookup current coverage', () => {
        expect(utils.getCurrentCoverage).toHaveBeenCalledWith(bumper.config)
      })

      it('should read previous contents of the "package.json" file', () => {
        expect(readFile).toHaveBeenCalledWith(location, 'utf8')
      })

      it('should write new contents of the "package.json" file', () => {
        const newPkgJson = __.cloneDeep(_pkgJson)
        newPkgJson['pr-bumper'].coverage = 99.57
        expect(writeFile).toHaveBeenCalledWith(location, JSON.stringify(newPkgJson, null, 2))
      })

      it('should add "package.json" to the list of modified files', () => {
        expect(info.modifiedFiles).toContain('package.json')
      })

      it('should resolve with the info', () => {
        expect(result).toBe(info)
      })

      it('should not reject', () => {
        expect(error).toBe(null)
      })
    })
  })
})
