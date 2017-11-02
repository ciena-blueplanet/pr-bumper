import _ from 'lodash'
import path from 'path'
import Promise from 'promise'

import {mkdir, readFile, stat, writeFile} from '../fs'
import logger from '../logger'
import {find as findLicenses} from '../nlf'

const LICENSE_PATTERN = /\b(Apache|ISC|MIT)\b/i

/**
 * Getting out the heavy artillery for figuring out the license: do regex on license stuff
 * @param {Object} licenseObject - part of the license object; has `text` and
 *   `filePath` strings on itPacket Used Resources
 * @returns {String} - a simple string tag for what the license is
 */
export function _parseLicense (licenseObject) {
  const text = licenseObject.text || licenseObject.filePath
  const match = text.match(LICENSE_PATTERN)

  if (match) {
    // Since match is case-insensitive we must normalize license to have
    // desired casing.
    const license = match[0].toUpperCase()
    return license === 'APACHE' ? 'Apache' : license
  }

  return 'UNKNOWN'
}

/**
 * We have a little chunk of the license data that we have gotten from nlf
 * now we want to do our best to tag it
 * @param {Object} licenseSources - the section of the nlf config with license data
 * @returns {String} - some pithy string summary of what the licenses are (e.g. "MIT, BSD")
 */
export function _getLicense (licenseSources) {
  const output = []

  if (licenseSources.package.sources.length > 0) {
    for (let source of licenseSources.package.sources) {
      output.push(source.license)
    }
  } else if (licenseSources.license.sources.length > 0) {
    for (let source of licenseSources.license.sources) {
      output.push(_parseLicense(source))
    }
  }

  return output.join(', ')
}

/**
 * Make sure the path exists and that it's a directory
 * @param {String} directoryPath - a directory for where we're putting stuff
 * @returns {Promise} a promise for the directory existing
 */
export function ensureDirectory (directoryPath) {
  logger.log('...checking directory')
  return stat(directoryPath)
    .then(stats => {
      if (stats.isDirectory()) {
        return true
      }
      throw new Error(`${directoryPath} exists but is not a directory!`)
    })
    .catch(() => {
      return mkdir(directoryPath)
    })
}

/**
 * Get all the version info in a specific format
 * @param {String} cwd - current working directory
 * @param {String} npmOutputFilePath - path where we're going to write the package dependencies file
 * @param {Config} config - the .pr-bumper.json config
 * @returns {Promise} A promise for a string
 */
export function getNpmLicenseData (cwd, npmOutputFilePath, config) {
  logger.log('...getting license data')

  return findLicenses({
    directory: cwd,
    production: config.features.compliance.production
  })
    .then(packageLicenseData => {
      let versionData = []
      for (let packageLicenseDatum of packageLicenseData) {
        if (packageLicenseDatum.licenseSources === undefined) {
          logger.error(`ERROR: ${packageLicenseDatum.id} has no licenseSources?`)
          continue
        }
        let license = _getLicense(packageLicenseDatum.licenseSources)
        versionData.push({version: packageLicenseDatum.version, name: packageLicenseDatum.name, license})
      }
      versionData = _.sortBy(versionData, ['name', 'version'])

      return writeFile(npmOutputFilePath, JSON.stringify({'schema-version': 1, data: versionData}, null, '  '))
        .then(() => {
          return `successfully wrote ${npmOutputFilePath}`
        })
        .catch(error => {
          logger.error(`(1) ERROR: writing ${npmOutputFilePath}`, error)
          throw error
        })
    })
}

/**
 * Get a list of repositories that don't contain code we care about
 * @param {String} cwd - string for current-working-directory
 * @param {Config} config - the .pr-bumper.json config
 * @returns {Promise} A promise for a string of repository URLs
 */
export function getPackageData (cwd, config) {
  logger.log('...getting package data')
  const filename = path.join(cwd, 'package.json')
  return readFile(filename, 'utf8')
    .then(result => {
      const data = _.filter(result.split('\n').map(line => {
        let url
        _.each(config.features.compliance.additionalRepos, repo => {
          const regex = new RegExp(repo.pattern)
          let matches = regex.exec(line)
          if (matches !== null) {
            if (matches[1] === config.vcs.repository.repo) {
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
}

/**
 * Run processing for dependencyReport and output to the directory specified
 * @param {String} cwd - string for current-working-directory
 * @param {String} directoryPath - the place to dump our files
 * @param {Config} config - the .pr-bumper.json config
 * @returns {Promise} - a promise for everything to be done
 */
export function main (cwd, directoryPath, config) {
  const npmOutputFilePath = path.join(directoryPath, config.features.compliance.output.requirementsFile)
  const reposFilePath = path.join(directoryPath, config.features.compliance.output.reposFile)
  const ignoreFile = path.join(directoryPath, config.features.compliance.output.ignoreFile)

  return ensureDirectory(directoryPath)
    .then(() => {
      return Promise.all([

        getNpmLicenseData(cwd, npmOutputFilePath, config),

        getPackageData(cwd, config)
          .then(packageText => {
            return writeFile(reposFilePath, packageText)
              .then(() => {
                return `successfully wrote ${reposFilePath}`
              })
              .catch(error => {
                logger.error(`(1) ERROR: writing ${reposFilePath}`, error)
                throw error
              })
          })
          .catch(error => {
            logger.error(`(2) ERROR: writing ${reposFilePath}`, error)
            throw error
          }),

        readFile(path.join(cwd, '.gitignore'))
          .then(text => {
            return writeFile(ignoreFile, text)
              .then(() => {
                return `successfully wrote ${ignoreFile}`
              })
              .catch(error => {
                logger.error(`(1) ERROR: writing ${ignoreFile}`, error)
                throw error
              })
          })
          .catch(error => {
            logger.error(`(2) ERROR: writing ${ignoreFile}`, error)
            throw error
          })
      ])
    })
    .catch(error => {
      logger.error('something bad happened', error)
      throw error
    })
}

/**
 * Run processing for dependencyReport and output to the directory specified
 * @param {String} cwd - string for current-working-directory
 * @param {String} directoryPath - the place to dump our files
 * @param {Config} config - the .pr-bumper.json config
 * @returns {Object} a promise
 */
export function run (cwd, directoryPath, config) {
  logger.log('Generating dependency report...')
  return main(cwd, directoryPath, config)
    .then(output => {
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
    .catch(error => {
      logger.log(error)
      throw error
    })
}
