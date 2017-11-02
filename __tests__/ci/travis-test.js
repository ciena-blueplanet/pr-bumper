jest.mock('../../src/exec')
jest.mock('../../src/logger')

import CiBase from '../../src/ci/base'
import Travis from '../../src/ci/travis'
import exec from '../../src/exec'
import logger from '../../src/logger'
import {ensureCiBaseMethodIsUsed} from './utils'

describe('CI / Travis', () => {
  const ctx = {}
  let travis, config

  beforeEach(() => {
    config = {
      computed: {
        ci: {
          branch: 'my-branch'
        }
      }
    }
    travis = new Travis(config, {id: 'vcs'})
    ctx.ci = travis
  })

  it('should save the config', () => {
    expect(travis.config).toBe(config)
  })

  it('should save the vcs', () => {
    expect(travis.vcs).toEqual({id: 'vcs'})
  })

  it('should extend CiBase', () => {
    expect(travis).toBeInstanceOf(CiBase)
  })

  ensureCiBaseMethodIsUsed(ctx, 'add')
  ensureCiBaseMethodIsUsed(ctx, 'commit')

  describe('.push()', () => {
    let result

    beforeEach(() => {
      travis.vcs = {addRemoteForPush () {}}
      jest.spyOn(travis.vcs, 'addRemoteForPush').mockReturnValue(Promise.resolve('ci-origin'))
      exec.mockReturnValue(Promise.resolve('pushed'))

      return travis.push().then(res => {
        result = res
      })
    })

    afterEach(() => {
      travis.vcs.addRemoteForPush.mockRestore()
    })

    it('should add the push remote via the vcs', () => {
      expect(travis.vcs.addRemoteForPush).toHaveBeenCalledTimes(1)
    })

    it('should log that it is about to push my-master to the new remote', () => {
      expect(logger.log).toHaveBeenCalledWith('Pushing ci-my-branch to ci-origin')
    })

    it('should push the ci-my-branch branch to new remote', () => {
      expect(exec).toHaveBeenCalledWith('git push ci-origin ci-my-branch:refs/heads/my-branch --tags')
    })

    it('should resolve with result of the git push', () => {
      expect(result).toBe('pushed')
    })
  })

  describe('.setupGitEnv()', () => {
    let result

    beforeEach(() => {
      jest.spyOn(CiBase.prototype, 'setupGitEnv').mockReturnValue(Promise.resolve())
      exec.mockReturnValue(Promise.resolve('checked-out'))

      return travis.setupGitEnv().then(res => {
        result = res
      })
    })

    afterEach(() => {
      CiBase.prototype.setupGitEnv.mockRestore()
    })

    it('should call the base .setupGitEnv()', () => {
      expect(CiBase.prototype.setupGitEnv).toHaveBeenCalledTimes(1)
    })

    it('should create and check out ci-my-branch branch', () => {
      expect(exec).toHaveBeenCalledWith('git checkout -b ci-my-branch')
    })

    it('should resolve with the result of the git checkout', () => {
      expect(result).toBe('checked-out')
    })
  })
})
