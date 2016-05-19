'use strict'

const expect = require('chai').expect
const Promise = require('promise')
const sinon = require('sinon')

const utils = require('../lib/utils')
const logger = require('../lib/logger')
const Cli = require('../lib/cli')

const TeamCity = require('../lib/ci/teamcity')
const Travis = require('../lib/ci/travis')

const BitbucketServer = require('../lib/vcs/bitbucket-server')
const GitHub = require('../lib/vcs/github')

describe('Cli', () => {
  let cli, sandbox
  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    sandbox.stub(logger, 'log')

    cli = new Cli()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('.run()', () => {
    let bumper, result, error
    beforeEach(() => {
      bumper = {
        bump: sandbox.stub().returns(Promise.resolve('bumped')),
        check: sandbox.stub().returns(Promise.resolve('checked'))
      }

      sandbox.stub(utils, 'getConfig').returns({id: 'config'})
      sandbox.stub(cli, '_getVcs').returns({id: 'vcs'})
      sandbox.stub(cli, '_getCi').returns({id: 'ci'})
      sandbox.stub(cli, '_getBumper').returns(bumper)
    })

    describe('bump', () => {
      beforeEach(() => {
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

      it('gets the config', () => {
        expect(utils.getConfig.calledOnce).to.be.ok
      })

      it('gets the vcs', () => {
        expect(cli._getVcs.lastCall.args).to.be.eql([{id: 'config'}])
      })

      it('gets the ci', () => {
        expect(cli._getCi.lastCall.args).to.be.eql([{id: 'config'}, {id: 'vcs'}])
      })

      it('gets the bumper', () => {
        expect(cli._getBumper.lastCall.args).to.be.eql([{
          ci: {id: 'ci'},
          config: {id: 'config'},
          vcs: {id: 'vcs'}
        }])
      })

      it('resolves with the result of bump', () => {
        expect(result).to.be.equal('bumped')
      })

      it('does not error', () => {
        expect(error).not.to.be.ok
      })
    })

    describe('check', () => {
      beforeEach(() => {
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

      it('gets the config', () => {
        expect(utils.getConfig.calledOnce).to.be.ok
      })

      it('gets the vcs', () => {
        expect(cli._getVcs.lastCall.args).to.be.eql([{id: 'config'}])
      })

      it('gets the ci', () => {
        expect(cli._getCi.lastCall.args).to.be.eql([{id: 'config'}, {id: 'vcs'}])
      })

      it('gets the bumper', () => {
        expect(cli._getBumper.lastCall.args).to.be.eql([{
          ci: {id: 'ci'},
          config: {id: 'config'},
          vcs: {id: 'vcs'}
        }])
      })

      it('resolves with the result of check', () => {
        expect(result).to.be.equal('checked')
      })

      it('does not error', () => {
        expect(error).not.to.be.ok
      })
    })

    describe('invalid command', () => {
      beforeEach(() => {
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

      it('rejects with an error', () => {
        expect(error).to.be.equal('Invalid command: foo-bar')
      })

      it('does not resolve', () => {
        expect(result).not.to.be.ok
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

      it('passess along config', () => {
        expect(ci.config).to.be.eql(config)
      })

      it('passess along vcs', () => {
        expect(ci.vcs).to.be.eql(vcs)
      })

      it('creates a TeamCity instance', () => {
        expect(ci).to.be.an.instanceof(TeamCity)
      })
    })

    describe('with travis provider', () => {
      beforeEach(() => {
        config.ci.provider = 'travis'
        ci = cli._getCi(config, vcs)
      })

      it('passess along config', () => {
        expect(ci.config).to.be.eql(config)
      })

      it('passess along vcs', () => {
        expect(ci.vcs).to.be.eql(vcs)
      })

      it('creates a Travis instance', () => {
        expect(ci).to.be.an.instanceof(Travis)
      })
    })

    describe('with invalid provider', () => {
      beforeEach(() => {
        config.ci.provider = 'unknown provider'
      })

      it('throws an error', () => {
        const fn = () => {
          ci = cli._getCi(config, vcs)
        }

        expect(fn).to.throw('Invalid ci provider: [unknown provider]')
      })
    })
  })

  describe('._getVcs()', () => {
    let config, vcs

    beforeEach(() => {
      config = {
        vcs: {
          auth: {}
        }
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

      it('passess along config', () => {
        expect(vcs.config).to.be.eql(config)
      })

      it('creates a BitbucketServer instance', () => {
        expect(vcs).to.be.an.instanceof(BitbucketServer)
      })
    })

    describe('with github provider', () => {
      beforeEach(() => {
        config.vcs.provider = 'github'
        console.log('getting a github vcs')
        vcs = cli._getVcs(config)
      })

      it('passess along config', () => {
        expect(vcs.config).to.be.eql(config)
      })

      it('creates a GitHub instance', () => {
        expect(vcs).to.be.an.instanceof(GitHub)
      })
    })

    describe('with invalid provider', () => {
      beforeEach(() => {
        config.vcs.provider = 'unknown provider'
      })

      it('throws an error', () => {
        const fn = () => {
          vcs = cli._getVcs(config)
        }

        expect(fn).to.throw('Invalid vcs provider: [unknown provider]')
      })
    })
  })
})
