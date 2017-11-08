jest.mock('../src/logger')
jest.mock('../src/utils')

import Promise from 'promise'

import Bumper from '../src/bumper'
import TeamCity from '../src/ci/teamcity'
import Travis from '../src/ci/travis'
import Cli from '../src/cli'
import * as utils from '../src/utils'
import BitbucketServer from '../src/vcs/bitbucket-server'
import GitHub from '../src/vcs/github'
import GitHubEnterprise from '../src/vcs/github-enterprise'

describe('Cli', () => {
  let cli

  beforeEach(() => {
    cli = new Cli()
  })

  describe('_getBumper', () => {
    it('should return an instance of bumper given params', () => {
      const bumper = cli._getBumper({
        ci: {id: 'ci'},
        vcs: {id: 'vcs'},
        config: {id: 'config'}
      })

      expect(bumper).toBeInstanceOf(Bumper)
    })
  })

  describe('.run()', () => {
    let bumper, result, error

    beforeEach(() => {
      bumper = {
        bump: jest.fn().mockReturnValue(Promise.resolve('bumped')),
        check: jest.fn().mockReturnValue(Promise.resolve('checked')),
        checkCoverage: jest.fn().mockReturnValue(Promise.resolve('coverage-checked'))
      }

      utils.getConfig.mockReturnValue({id: 'config'})
      jest.spyOn(cli, '_getVcs').mockReturnValue({id: 'vcs'})
      jest.spyOn(cli, '_getCi').mockReturnValue({id: 'ci'})
      jest.spyOn(cli, '_getBumper').mockReturnValue(bumper)
    })

    afterEach(() => {
      utils.getConfig.mockReset()
      cli._getVcs.mockRestore()
      cli._getCi.mockRestore()
      cli._getBumper.mockRestore()
    })

    describe('bump', () => {
      beforeEach(() => {
        result = ''
        error = ''

        return cli
          .run('bump')
          .then(res => {
            result = res
          })
          .catch(err => {
            error = err
          })
      })

      it('should get the config', () => {
        expect(utils.getConfig).toHaveBeenCalledTimes(1)
      })

      it('should gets the vcs', () => {
        expect(cli._getVcs).toHaveBeenCalledWith({id: 'config'})
      })

      it('should get the ci', () => {
        expect(cli._getCi).toHaveBeenCalledWith({id: 'config'}, {id: 'vcs'})
      })

      it('should get the bumper', () => {
        expect(cli._getBumper).toHaveBeenCalledWith({
          ci: {id: 'ci'},
          config: {id: 'config'},
          vcs: {id: 'vcs'}
        })
      })

      it('should resolve with the result of bump', () => {
        expect(result).toBe('bumped')
      })

      it('should not error', () => {
        expect(error).toBe('')
      })
    })

    describe('check', () => {
      beforeEach(() => {
        result = ''
        error = ''

        return cli
          .run('check')
          .then(res => {
            result = res
          })
          .catch(err => {
            error = err
          })
      })

      it('should get the config', () => {
        expect(utils.getConfig).toHaveBeenCalledTimes(1)
      })

      it('should get the vcs', () => {
        expect(cli._getVcs).toHaveBeenCalledWith({id: 'config'})
      })

      it('should get the ci', () => {
        expect(cli._getCi).toHaveBeenCalledWith({id: 'config'}, {id: 'vcs'})
      })

      it('should get the bumper', () => {
        expect(cli._getBumper).toHaveBeenCalledWith({
          ci: {id: 'ci'},
          config: {id: 'config'},
          vcs: {id: 'vcs'}
        })
      })

      it('should resolve with the result of check', () => {
        expect(result).toBe('checked')
      })

      it('should not error', () => {
        expect(error).toBe('')
      })
    })

    describe('check-coverage', () => {
      beforeEach(() => {
        result = ''
        error = ''

        return cli
          .run('check-coverage')
          .then(res => {
            result = res
          })
          .catch(err => {
            error = err
          })
      })

      it('should get the config', () => {
        expect(utils.getConfig).toHaveBeenCalledTimes(1)
      })

      it('should get the vcs', () => {
        expect(cli._getVcs).toHaveBeenCalledWith({id: 'config'})
      })

      it('should get the ci', () => {
        expect(cli._getCi).toHaveBeenCalledWith({id: 'config'}, {id: 'vcs'})
      })

      it('should get the bumper', () => {
        expect(cli._getBumper).toHaveBeenCalledWith({
          ci: {id: 'ci'},
          config: {id: 'config'},
          vcs: {id: 'vcs'}
        })
      })

      it('should resolve with the result of check', () => {
        expect(result).toBe('coverage-checked')
      })

      it('should not error', () => {
        expect(error).toBe('')
      })
    })

    describe('check-coverage --skip-comments', () => {
      let _config

      beforeEach(() => {
        result = ''
        error = ''
        _config = {
          id: 'config',
          features: {
            comments: {
              enabled: false
            }
          }
        }

        return cli
          .run('check-coverage', true)
          .then(res => {
            result = res
          })
          .catch(err => {
            error = err
          })
      })

      it('should get the config', () => {
        expect(utils.getConfig).toHaveBeenCalledTimes(1)
      })

      it('should get the vcs', () => {
        expect(cli._getVcs).toHaveBeenCalledWith(_config)
      })

      it('should get the ci', () => {
        expect(cli._getCi).toHaveBeenCalledWith(_config, {id: 'vcs'})
      })

      it('should get the bumper', () => {
        expect(cli._getBumper).toHaveBeenCalledWith({
          ci: {id: 'ci'},
          config: _config,
          vcs: {id: 'vcs'}
        })
      })

      it('should resolve with the result of check', () => {
        expect(result).toBe('coverage-checked')
      })

      it('should not error', () => {
        expect(error).toBe('')
      })
    })

    describe('invalid command', () => {
      beforeEach(() => {
        result = ''
        error = ''

        return cli
          .run('foo-bar')
          .then(res => {
            result = res
          })
          .catch(err => {
            error = err
          })
      })

      it('should reject with an error', () => {
        expect(error).toBe('Invalid command: foo-bar')
      })

      it('should not resolve', () => {
        expect(result).toBe('')
      })
    })
  })

  describe('._getCi()', () => {
    let config, vcs, ci

    beforeEach(() => {
      config = {ci: {}}
      vcs = {id: 'vcs'}
    })

    describe('with teamcity provider', () => {
      beforeEach(() => {
        config.ci.provider = 'teamcity'
        ci = cli._getCi(config, vcs)
      })

      it('should pass along config', () => {
        expect(ci.config).toEqual(config)
      })

      it('should pass along vcs', () => {
        expect(ci.vcs).toEqual(vcs)
      })

      it('should create a TeamCity instance', () => {
        expect(ci).toBeInstanceOf(TeamCity)
      })
    })

    describe('with travis provider', () => {
      beforeEach(() => {
        config.ci.provider = 'travis'
        ci = cli._getCi(config, vcs)
      })

      it('should pass along config', () => {
        expect(ci.config).toEqual(config)
      })

      it('should pass along vcs', () => {
        expect(ci.vcs).toEqual(vcs)
      })

      it('should create a Travis instance', () => {
        expect(ci).toBeInstanceOf(Travis)
      })
    })

    describe('with invalid provider', () => {
      beforeEach(() => {
        config.ci.provider = 'unknown provider'
      })

      it('should throw an error', () => {
        expect(() => {
          cli._getCi(config, vcs)
        }).toThrow('Invalid ci provider: [unknown provider]')
      })
    })
  })

  describe('._getVcs()', () => {
    let config, vcs

    beforeEach(() => {
      config = {
        computed: {
          vcs: {
            auth: {}
          }
        },
        vcs: {}
      }
    })

    describe('with bitbucket-server provider', () => {
      beforeEach(() => {
        config.vcs.provider = 'bitbucket-server'
        config.vcs.auth = {
          username: 'foo',
          password: 'bar'
        }
        vcs = cli._getVcs(config)
      })

      it('should pass along config', () => {
        expect(vcs.config).toEqual(config)
      })

      it('should create a BitbucketServer instance', () => {
        expect(vcs).toBeInstanceOf(BitbucketServer)
      })
    })

    describe('with github provider', () => {
      beforeEach(() => {
        config.vcs.provider = 'github'
        vcs = cli._getVcs(config)
      })

      it('should pass along config', () => {
        expect(vcs.config).toEqual(config)
      })

      it('should create a GitHub instance', () => {
        expect(vcs).toBeInstanceOf(GitHub)
      })
    })

    describe('with github enterprise provider', () => {
      beforeEach(() => {
        config.vcs.provider = 'github-enterprise'
        vcs = cli._getVcs(config)
      })

      it('should pass along config', () => {
        expect(vcs.config).toEqual(config)
      })

      it('should create a GitHubEnterprise instance', () => {
        expect(vcs).toBeInstanceOf(GitHubEnterprise)
      })
    })

    describe('with invalid provider', () => {
      beforeEach(() => {
        config.vcs.provider = 'unknown provider'
      })

      it('should throw an error', () => {
        expect(() => {
          cli._getVcs(config)
        }).toThrow('Invalid vcs provider: [unknown provider]')
      })
    })
  })
})
