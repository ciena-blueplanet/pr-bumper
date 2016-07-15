'use strict'

const fs = require('fs')
const path = require('path')
const Q = require('q')
const _ = require('lodash')
const nlf = require('nlf')
const logger = require('../logger')

module.exports = {

  /** *****************************************************************
   *  External methods are defined in object so they can be stubbed  *
   *******************************************************************/

  stat: Q.denodeify(fs.stat),
  mkdir: Q.denodeify(fs.mkdir),
  writeFile: Q.denodeify(fs.writeFile),
  readFile: Q.denodeify(fs.readFile),
  findLicenses: Q.denodeify(nlf.find),

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
    /*
     * Should we do any regex parsing of the text in the license?
    if ('\n' in text) {
      let re = /\\/gi;
      text = text.replace(re, '');
      let lines = text.split('\n').splice(1) // pull off copyright text
      let license = ' '.join(lines)
      if (license.indexOf(BSD) !== -1) {
        return 'BSD'
      }
    }
   */
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
   * @returns {Promise} A promise for a string
   */
  getNpmLicenseData (cwd, npmOutputFilePath) {
    return this.findLicenses({
      directory: cwd,
      production: true
    })
      .then((packageLicenseData) => {
        let versionData = []
        for (let packageLicenseDatum of packageLicenseData) {
          if (packageLicenseDatum.licenseSources === undefined) {
            logger.log(`ERROR: ${packageLicenseDatum.id} has no licenseSources?`)
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
            logger.log(`(1) ERROR: writing ${npmOutputFilePath}`, error)
            throw error
          })
      })
  },

  /**
   * Get a list of repositories that don't contain code we care about
   * @param {String} cwd - string for current-working-directory
   * @param {String} ourRepoName - the name of our own repos
   * @returns {Promise} A promise for a string of repository URLs
   */
  getPackageData (cwd, ourRepoName) {
    const publicRegex = /\s+"(ember\-frost\-\S+)"/
    const privateRegex = /\s+"(frost\-\S+)"/
    const filename = path.join(cwd, 'package.json')
    return this.readFile(filename, 'utf8')
      .then((result) => {
        const data = _.filter(result.split('\n').map((line) => {
          let name
          let matches = publicRegex.exec(line)
          if (matches !== null) {
            name = matches[1]
            return `https://github.com/ciena-frost/${name}.git`
          }
          matches = privateRegex.exec(line)
          if (matches !== null) {
            name = matches[1]
            if (name === ourRepoName) {
              return undefined
            }
            return `https://bitbucket.ciena.com/scm/bp_frost/${name}.git`
          }
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
   * Run processing for blackduck and output to the directory specified
   * @param {String} cwd - string for current-working-directory
   * @param {String} directoryPath - the place to dump our files
   * @param {String} ourRepoName - the name of our own repos
   * @returns {Promise} - a promise for everything to be done
   */
  main (cwd, directoryPath, ourRepoName) {
    const npmOutputFilePath = path.join(directoryPath, 'js_requirements.json')
    const reposFilePath = path.join(directoryPath, 'repos')
    const ignoreFile = path.join(directoryPath, 'ignore')

    return this.ensureDirectory(directoryPath)
      .then(() => {
        return Q.all([

          this.getNpmLicenseData(cwd, npmOutputFilePath),

          this.getPackageData(cwd, ourRepoName)
            .then((packageText) => {
              return this.writeFile(reposFilePath, packageText)
                .then(() => {
                  return `successfully wrote ${reposFilePath}`
                })
                .catch((error) => {
                  logger.log(`(1) ERROR: writing ${reposFilePath}`, error)
                  throw error
                })
            })
            .catch((error) => {
              logger.log(`(2) ERROR: writing ${reposFilePath}`, error)
              throw error
            }),

          this.readFile(path.join(cwd, '.gitignore'))
            .then((text) => {
              return this.writeFile(ignoreFile, text)
                .then(() => {
                  return `successfully wrote ${ignoreFile}`
                })
                .catch((error) => {
                  logger.log(`(1) ERROR: writing ${ignoreFile}`, error)
                  throw error
                })
            })
            .catch((error) => {
              logger.log(`(2) ERROR: writing ${ignoreFile}`, error)
              throw error
            })
        ])
      })
      .catch((error) => {
        logger.log('something bad happened', error)
        throw error
      })
  },

  /**
   * Run processing for blackduck and output to the directory specified
   * @param {String} cwd - string for current-working-directory
   * @param {String} directoryPath - the place to dump our files
   * @param {String} ourRepoName - the name of our own repos
   * @returns {Object} a promise
   */
  run (cwd, directoryPath, ourRepoName) {
    return this.main(cwd, directoryPath, ourRepoName)
      .then((output) => {
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
