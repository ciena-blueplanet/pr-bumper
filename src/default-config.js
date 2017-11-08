/**
 * @flow
 */

import deepFreeze from 'freezly'

export default deepFreeze({
  ci: {
    env: {
      branch: 'TRAVIS_BRANCH',
      buildNumber: 'TRAVIS_BUILD_NUMBER',
      pr: 'TRAVIS_PULL_REQUEST',
      repoSlug: 'TRAVIS_REPO_SLUG'
    },
    gitUser: {
      email: 'travis.ci.ciena@gmail.com',
      name: 'Travis CI'
    },
    provider: 'travis'
  },
  computed: {
    baselineCoverage: 0,
    ci: {
      buildNumber: '',
      branch: '',
      isPr: false,
      prNumber: ''
    },
    vcs: {
      auth: {
        username: '',
        password: ''
      }
    }
  },
  features: {
    changelog: {
      enabled: false,
      file: 'CHANGELOG.md'
    },
    comments: {
      enabled: false
    },
    compliance: {
      additionalRepos: [],
      enabled: false,
      production: false,
      output: {
        directory: undefined,
        ignoreFile: 'ignore',
        reposFile: 'repos',
        requirementsFile: 'js-requirements.json'
      }
    },
    coverage: {
      enabled: false,
      file: 'coverage/coverage-summary.json'
    },
    dependencies: {
      enabled: false,
      snapshotFile: 'dependency-snapshot.json'
    },
    maxScope: {
      enabled: false,
      value: 'major'
    }
  },

  /**
   * Check if given feature is enabled
   * @param {String} featureName - the name of the feature to check
   * @returns {Boolean} true if feature enabled, else false
   */
  isEnabled (featureName: string) {
    const {features} = this

    if (featureName in features) {
      return features[featureName].enabled
    }

    throw new Error(`Unknown feature ${featureName}`)
  },

  vcs: {
    domain: 'github.com',
    env: {
      password: '',
      readToken: 'RO_GH_TOKEN',
      username: '',
      writeToken: 'GITHUB_TOKEN'
    },
    provider: 'github',
    repository: {
      name: '',
      owner: ''
    }
  }
})
