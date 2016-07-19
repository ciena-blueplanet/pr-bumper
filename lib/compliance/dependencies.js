'use strict'

const fs = require('fs')
const path = require('path')
const Promise = require('promise')
const _ = require('lodash')
const nlf = require('nlf')
const logger = require('../logger')

module.exports = {

  /** *****************************************************************
   *  External methods are defined in object so they can be stubbed  *
   *******************************************************************/

  stat: Promise.denodeify(fs.stat),
  mkdir: Promise.denodeify(fs.mkdir),
  writeFile: Promise.denodeify(fs.writeFile),
  readFile: Promise.denodeify(fs.readFile),
  findLicenses: Promise.denodeify(nlf.find),

  /**
   * Getting out the heavy artillery for figuring out the license: do regex on license stuff
   * @param {Object} licenseObject - part of the license object; has `text` and
   *   `filePath` strings on itPacket Used Resources
   * @returns {String} - a simple string tag for what the license is
   */
  _parseLicense (licenseObject) {
    let text = licenseObject.text || licenseObject.filePath
    if (/MIT/.exec(text)) {
      return 'MIT'
    }
    if (/ISC/.exec(text)) {
      return 'ISC'
    }
    if (/Apache/.exec(text)) {
      return 'Apache'
    }
    return 'UNKNOWN'
  },

  /**
   * We have a little chunk of the license data that we have gotten from nlf
   * now we want to do our best to tag it
   * @param {Object} licenseSources - the section of the nlf config with license data
   * @returns {String} - some pithy string summary of what the licenses are (e.g. "MIT, BSD")
   */
  _getLicense (licenseSources) {
    let output = []
    if (licenseSources.package.sources.length > 0) {
      for (let source of licenseSources.package.sources) {
        output.push(source.license)
      }
    } else if (licenseSources.license.sources.length > 0) {
      for (let source of licenseSources.license.sources) {
        output.push(this._parseLicense(source))
      }
    }
    return output.join(', ')
  },

  /**
   * Get all the version info in a specific format
   * @param {String} cwd - current working directory
   * @param {String} npmOutputFilePath - path where we're going to write the package dependencies file
   * @param {object} config - the .pr-bumper.json config
   * @returns {Promise} A promise for a string
   */
  getNpmLicenseData (cwd, npmOutputFilePath, config) {
    logger.log('...getting license data')
    return this.findLicenses({
      directory: cwd,
      production: config.dependencies.production
    })
      .then((packageLicenseData) => {
        let versionData = []
        for (let packageLicenseDatum of packageLicenseData) {
          if (packageLicenseDatum.licenseSources === undefined) {
            logger.error(`ERROR: ${packageLicenseDatum.id} has no licenseSources?`)
            continue
          }
          let license = this._getLicense(packageLicenseDatum.licenseSources)
          versionData.push({version: packageLicenseDatum.version, name: packageLicenseDatum.name, license})
        }
        versionData = _.sortBy(versionData, ['name', 'version'])

        return this.writeFile(npmOutputFilePath, JSON.stringify({'schema-version': 1, data: versionData}, null, '  '))
          .then(() => {
            return `successfully wrote ${npmOutputFilePath}`
          })
          .catch((error) => {
            logger.error(`(1) ERROR: writing ${npmOutputFilePath}`, error)
            throw error
          })
      })
  },

  /**
   * Get a list of repositories that don't contain code we care about
   * @param {String} cwd - string for current-working-directory
   * @param {Object} config - the .pr-bumper.json config
   * @returns {Promise} A promise for a string of repository URLs
   */
  getPackageData (cwd, config) {
    logger.log('...getting package data')
    const filename = path.join(cwd, 'package.json')
    return this.readFile(filename, 'utf8')
      .then((result) => {
        const data = _.filter(result.split('\n').map((line) => {
          let url
          _.each(config.dependencies.additionalRepos, (repo) => {
            const regex = new RegExp(repo.pattern)
            let matches = regex.exec(line)
            if (matches !== null) {
              if (matches[1] === config.repo) {
                url = undefined
              } else {
                url = repo.url.split('${REPO_NAME}').join(matches[1])
              }
            }
          })
          return url
        }))
        return data.sort().join('\n') + '\n'
      })
  },

  /**
   * Make sure the path exists and that it's a directory
   * @param {String} directoryPath - a directory for where we're putting stuff
   * @returns {Promise} a promise for the directory existing
   */
  ensureDirectory (directoryPath) {
    logger.log('...checking directory')
    return this.stat(directoryPath)
      .then((stats) => {
        if (stats.isDirectory()) {
          return true
        }
        throw new Error(`${directoryPath} exists but is not a directory!`)
      })
      .catch(() => {
        return this.mkdir(directoryPath)
      })
  },

  /**
   * Run processing for dependencyReport and output to the directory specified
   * @param {String} cwd - string for current-working-directory
   * @param {String} directoryPath - the place to dump our files
   * @param {Object} config - the .pr-bumper.json config
   * @returns {Promise} - a promise for everything to be done
   */
  main (cwd, directoryPath, config) {
    const npmOutputFilePath = path.join(directoryPath, config.dependencies.output.requirementsFile)
    const reposFilePath = path.join(directoryPath, config.dependencies.output.reposFile)
    const ignoreFile = path.join(directoryPath, config.dependencies.output.ignoreFile)

    return this.ensureDirectory(directoryPath)
      .then(() => {
        return Promise.all([

          this.getNpmLicenseData(cwd, npmOutputFilePath, config),

          this.getPackageData(cwd, config)
            .then((packageText) => {
              return this.writeFile(reposFilePath, packageText)
                .then(() => {
                  return `successfully wrote ${reposFilePath}`
                })
                .catch((error) => {
                  logger.error(`(1) ERROR: writing ${reposFilePath}`, error)
                  throw error
                })
            })
            .catch((error) => {
              logger.error(`(2) ERROR: writing ${reposFilePath}`, error)
              throw error
            }),

          this.readFile(path.join(cwd, '.gitignore'))
            .then((text) => {
              return this.writeFile(ignoreFile, text)
                .then(() => {
                  return `successfully wrote ${ignoreFile}`
                })
                .catch((error) => {
                  logger.error(`(1) ERROR: writing ${ignoreFile}`, error)
                  throw error
                })
            })
            .catch((error) => {
              logger.error(`(2) ERROR: writing ${ignoreFile}`, error)
              throw error
            })
        ])
      })
      .catch((error) => {
        logger.error('something bad happened', error)
        throw error
      })
  },

  /**
   * Run processing for dependencyReport and output to the directory specified
   * @param {String} cwd - string for current-working-directory
   * @param {String} directoryPath - the place to dump our files
   * @param {Object} config - the .pr-bumper.json config
   * @returns {Object} a promise
   */
  run (cwd, directoryPath, config) {
    logger.log('Generating dependency report...')
    return this.main(cwd, directoryPath, config)
      .then((output) => {
        logger.log('...finished.')
        for (var i = 0, len = output.length; i < len; i++) {
          var line = output[i]
          if (line && line.startsWith('successfully')) {
            logger.log('✔︎', line)
          } else {
            logger.log('✘', line)
          }
        }
      })
      .catch((error) => {
        logger.log(error)
        throw error
      })
  }
}
