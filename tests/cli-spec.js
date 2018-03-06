'use strict'

const chai = require('chai')
const deepFreeze = require('freezly').default
const Promise = require('promise')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const expect = chai.expect
chai.use(sinonChai)

const utils = require('../lib/utils')
const logger = require('../lib/logger')
const Cli = require('../lib/cli')

const TeamCity = require('../lib/ci/teamcity')
const Travis = require('../lib/ci/travis')
const Bamboo = require('../lib/ci/bamboo')

const BitbucketServer = require('../lib/vcs/bitbucket-server')
const Bitbucket = require('../lib/vcs/bitbucket')
const GitHub = require('../lib/vcs/github')
const GitHubEnterprise = require('../lib/vcs/github-enterprise')

const Bumper = require('../lib/bumper')

describe('Cli', function () {
  let cli, sandbox
  beforeEach(function () {
    sandbox = sinon.sandbox.create()
    sandbox.stub(logger, 'log')

    cli = new Cli()
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('_getBumper', function () {
    it('should return an instance of bumper given params', function () {
      const bumper = cli._getBumper(deepFreeze({
        ci: {id: 'ci'},
        vcs: {id: 'vcs'},
        config: {id: 'config'}
      }))

      expect(bumper).to.be.an.instanceOf(Bumper)
    })
  })

  describe('.run()', function () {
    let bumper, result, error
    beforeEach(function () {
      bumper = {
        bump: sandbox.stub().returns(Promise.resolve('bumped')),
        check: sandbox.stub().returns(Promise.resolve('checked')),
        checkCoverage: sandbox.stub().returns(Promise.resolve('coverage-checked'))
      }

      sandbox.stub(utils, 'getConfig').returns({id: 'config'})
      sandbox.stub(cli, '_getVcs').returns({id: 'vcs'})
      sandbox.stub(cli, '_getCi').returns({id: 'ci'})
      sandbox.stub(cli, '_getBumper').returns(bumper)
    })

    describe('bump', function () {
      beforeEach(function () {
        result = ''
        error = ''

        return cli
          .run('bump')
          .then((res) => {
            result = res
          })
          .catch((err) => {
            error = err
          })
      })

      it('should get the config', function () {
        expect(utils.getConfig).to.have.callCount(1)
      })

      it('should gets the vcs', function () {
        expect(cli._getVcs).to.have.been.calledWith({id: 'config'})
      })

      it('should get the ci', function () {
        expect(cli._getCi).to.have.been.calledWith({id: 'config'}, {id: 'vcs'})
      })

      it('should get the bumper', function () {
        expect(cli._getBumper).to.have.been.calledWith({
          ci: {id: 'ci'},
          config: {id: 'config'},
          vcs: {id: 'vcs'}
        })
      })

      it('should resolve with the result of bump', function () {
        expect(result).to.equal('bumped')
      })

      it('should not error', function () {
        expect(error).to.equal('')
      })
    })

    describe('check', function () {
      beforeEach(function () {
        result = ''
        error = ''

        return cli
          .run('check')
          .then((res) => {
            result = res
          })
          .catch((err) => {
            error = err
          })
      })

      it('should get the config', function () {
        expect(utils.getConfig).to.have.callCount(1)
      })

      it('should get the vcs', function () {
        expect(cli._getVcs).to.have.been.calledWith({id: 'config'})
      })

      it('should get the ci', function () {
        expect(cli._getCi).to.have.been.calledWith({id: 'config'}, {id: 'vcs'})
      })

      it('should get the bumper', function () {
        expect(cli._getBumper).to.have.been.calledWith({
          ci: {id: 'ci'},
          config: {id: 'config'},
          vcs: {id: 'vcs'}
        })
      })

      it('should resolve with the result of check', function () {
        expect(result).to.equal('checked')
      })

      it('should not error', function () {
        expect(error).to.equal('')
      })
    })

    describe('check-coverage', function () {
      beforeEach(function () {
        result = ''
        error = ''

        return cli
          .run('check-coverage')
          .then((res) => {
            result = res
          })
          .catch((err) => {
            error = err
          })
      })

      it('should get the config', function () {
        expect(utils.getConfig).to.have.callCount(1)
      })

      it('should get the vcs', function () {
        expect(cli._getVcs).to.have.been.calledWith({id: 'config'})
      })

      it('should get the ci', function () {
        expect(cli._getCi).to.have.been.calledWith({id: 'config'}, {id: 'vcs'})
      })

      it('should get the bumper', function () {
        expect(cli._getBumper).to.have.been.calledWith({
          ci: {id: 'ci'},
          config: {id: 'config'},
          vcs: {id: 'vcs'}
        })
      })

      it('should resolve with the result of check', function () {
        expect(result).to.equal('coverage-checked')
      })

      it('should not error', function () {
        expect(error).to.equal('')
      })
    })

    describe('check-coverage --skip-comments', function () {
      let _config
      beforeEach(function () {
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
          .then((res) => {
            result = res
          })
          .catch((err) => {
            error = err
          })
      })

      it('should get the config', function () {
        expect(utils.getConfig).to.have.callCount(1)
      })

      it('should get the vcs', function () {
        expect(cli._getVcs).to.have.been.calledWith(_config)
      })

      it('should get the ci', function () {
        expect(cli._getCi).to.have.been.calledWith(_config, {id: 'vcs'})
      })

      it('should get the bumper', function () {
        expect(cli._getBumper).to.have.been.calledWith({
          ci: {id: 'ci'},
          config: _config,
          vcs: {id: 'vcs'}
        })
      })

      it('should resolve with the result of check', function () {
        expect(result).to.equal('coverage-checked')
      })

      it('should not error', function () {
        expect(error).to.equal('')
      })
    })

    describe('invalid command', function () {
      beforeEach(function () {
        result = ''
        error = ''

        return cli
          .run('foo-bar')
          .then((res) => {
            result = res
          })
          .catch((err) => {
            error = err
          })
      })

      it('should reject with an error', function () {
        expect(error).to.equal('Invalid command: foo-bar')
      })

      it('should not resolve', function () {
        expect(result).to.equal('')
      })
    })
  })

  describe('._getCi()', function () {
    let config, vcs, ci

    beforeEach(function () {
      config = {ci: {}}
      vcs = {id: 'vcs'}
    })

    describe('with teamcity provider', function () {
      beforeEach(function () {
        config.ci.provider = 'teamcity'
        ci = cli._getCi(deepFreeze(config), deepFreeze(vcs))
      })

      it('should pass along config', function () {
        expect(ci.config).to.deep.equal(config)
      })

      it('should pass along vcs', function () {
        expect(ci.vcs).to.deep.equal(vcs)
      })

      it('should create a TeamCity instance', function () {
        expect(ci).to.be.an.instanceof(TeamCity)
      })
    })

    describe('with travis provider', function () {
      beforeEach(function () {
        config.ci.provider = 'travis'
        ci = cli._getCi(deepFreeze(config), deepFreeze(vcs))
      })

      it('should pass along config', function () {
        expect(ci.config).to.deep.equal(config)
      })

      it('should pass along vcs', function () {
        expect(ci.vcs).to.deep.equal(vcs)
      })

      it('should create a Travis instance', function () {
        expect(ci).to.be.an.instanceof(Travis)
      })
    })

    describe('with bamboo provider', function () {
      beforeEach(function () {
        config.ci.provider = 'bamboo'
        ci = cli._getCi(deepFreeze(config), deepFreeze(vcs))
      })

      it('should pass along config', function () {
        expect(ci.config).to.deep.equal(config)
      })

      it('should pass along vcs', function () {
        expect(ci.vcs).to.deep.equal(vcs)
      })

      it('should create a Travis instance', function () {
        expect(ci).to.be.an.instanceof(Bamboo)
      })
    })

    describe('with invalid provider', function () {
      beforeEach(function () {
        config.ci.provider = 'unknown provider'
      })

      it('should throw an error', function () {
        expect(() => {
          cli._getCi(deepFreeze(config), deepFreeze(vcs))
        }).to.throw('Invalid ci provider: [unknown provider]')
      })
    })
  })

  describe('._getVcs()', function () {
    let config, vcs

    beforeEach(function () {
      config = {
        computed: {
          vcs: {
            auth: {}
          }
        },
        vcs: {}
      }
    })

    describe('with bitbucket-server provider', function () {
      beforeEach(function () {
        config.vcs.provider = 'bitbucket-server'
        config.vcs.auth = {
          username: 'foo',
          password: 'bar'
        }
        vcs = cli._getVcs(deepFreeze(config))
      })

      it('should pass along config', function () {
        expect(vcs.config).to.deep.equal(config)
      })

      it('should create a BitbucketServer instance', function () {
        expect(vcs).to.be.an.instanceof(BitbucketServer)
      })
    })

    describe('with bitbucket provider', function () {
      beforeEach(function () {
        config.vcs.provider = 'bitbucket'
        config.vcs.auth = {
          username: 'foo',
          password: 'bar'
        }
        vcs = cli._getVcs(deepFreeze(config))
      })

      it('should pass along config', function () {
        expect(vcs.config).to.deep.equal(config)
      })

      it('should create a Bitbucket instance', function () {
        expect(vcs).to.be.an.instanceof(Bitbucket)
      })
    })

    describe('with github provider', function () {
      beforeEach(function () {
        config.vcs.provider = 'github'
        vcs = cli._getVcs(deepFreeze(config))
      })

      it('should pass along config', function () {
        expect(vcs.config).to.deep.equal(config)
      })

      it('should create a GitHub instance', function () {
        expect(vcs).to.be.an.instanceof(GitHub)
      })
    })

    describe('with github enterprise provider', function () {
      beforeEach(function () {
        config.vcs.provider = 'github-enterprise'
        vcs = cli._getVcs(deepFreeze(config))
      })

      it('should pass along config', function () {
        expect(vcs.config).to.deep.equal(config)
      })

      it('should create a GitHubEnterprise instance', function () {
        expect(vcs).to.be.an.instanceof(GitHubEnterprise)
      })
    })

    describe('with invalid provider', function () {
      beforeEach(function () {
        config.vcs.provider = 'unknown provider'
      })

      it('should throw an error', function () {
        expect(() => {
          cli._getVcs(deepFreeze(config))
        }).to.throw('Invalid vcs provider: [unknown provider]')
      })
    })
  })
})
