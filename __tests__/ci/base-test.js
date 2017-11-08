jest.mock('../../src/child_process')
jest.mock('../../src/logger')

import {exec} from '../../src/child_process'
import CiBase from '../../src/ci/base'
import logger from '../../src/logger'

describe('CI / Base', () => {
  let base, config

  beforeEach(() => {
    config = {
      computed: {
        ci: {
          branch: 'my-branch'
        }
      }
    }
    base = new CiBase(config, {id: 'vcs'})
  })

  it('should save the config', () => {
    expect(base.config).toBe(config)
  })

  it('should save the vcs', () => {
    expect(base.vcs).toEqual({id: 'vcs'})
  })

  describe('.add()', () => {
    let result

    beforeEach(() => {
      exec.mockReturnValue(Promise.resolve('added'))
      return base.add(['foo', 'bar', 'baz'])
        .then(res => {
          result = res
        })
    })

    it('should add the files to git', () => {
      expect(exec).toHaveBeenCalledWith('git add foo bar baz')
    })

    it('should resolve with the result of the git command', () => {
      expect(result).toBe('added')
    })
  })

  describe('.commit()', () => {
    let result

    beforeEach(() => {
      exec.mockReturnValue(Promise.resolve('committed'))
      return base.commit('my summary message', 'my detail message')
        .then(res => {
          result = res
        })
    })

    it('should commit the files to git', () => {
      expect(exec).toHaveBeenCalledWith('git commit -m "my summary message" -m "my detail message"')
    })

    it('should resolve with the result of the git command', () => {
      expect(result).toBe('committed')
    })
  })

  describe('.getLastCommitMsg()', () => {
    let result

    beforeEach(() => {
      exec.mockReturnValue(Promise.resolve('Fix all the things'))
      return base.getLastCommitMsg()
        .then(res => {
          result = res
        })
    })

    it('should commit the files to git', () => {
      expect(exec).toHaveBeenCalledWith('git log --pretty=format:\'%s\' -1')
    })

    it('should resolve with the result of the git command', () => {
      expect(result).toBe('Fix all the things')
    })
  })

  describe('.push()', () => {
    let result

    beforeEach(() => {
      base.vcs = {
        addRemoteForPush: jest.fn().mockReturnValue(Promise.resolve('my-origin'))
      }
      exec.mockReturnValue(Promise.resolve('pushed'))
      return base.push()
        .then(res => {
          result = res
        })
    })

    it('should add the push remote via the vcs', () => {
      expect(base.vcs.addRemoteForPush).toHaveBeenCalledTimes(1)
    })

    it('should log that it is about to push', () => {
      expect(logger.log).toHaveBeenCalledWith('Pushing my-branch to my-origin')
    })

    it('should push origin to master with --tags', () => {
      expect(exec).toHaveBeenCalledWith('git push my-origin my-branch --tags')
    })

    it('should resolve with the result of the git command', () => {
      expect(result).toBe('pushed')
    })
  })

  describe('.setupGitEnv()', () => {
    let result

    beforeEach(() => {
      base.config = {
        ci: {
          gitUser: {
            email: 'ci-user@domain.com',
            name: 'ci-user'
          }
        }
      }

      exec.mockReturnValue(Promise.resolve('executed'))
      return base.setupGitEnv()
        .then(res => {
          result = res
        })
    })

    it('should configure the git user\'s email address', () => {
      expect(exec).toHaveBeenCalledWith('git config --global user.email "ci-user@domain.com"')
    })

    it('should configure the git user\'s name', () => {
      expect(exec).toHaveBeenCalledWith('git config --global user.name "ci-user"')
    })

    it('should resolve with the result of the git command', () => {
      expect(result).toBe('executed')
    })
  })

  describe('.tag()', () => {
    let result

    beforeEach(() => {
      exec.mockReturnValue(Promise.resolve('tagged'))
      return base.tag('v1.2.3', 'Super-cool tag description')
        .then(res => {
          result = res
        })
    })

    it('should create the tag', () => {
      expect(exec).toHaveBeenCalledWith('git tag v1.2.3 -a -m "Super-cool tag description"')
    })

    it('should resolve with the result of the exec call', () => {
      expect(result).toBe('tagged')
    })
  })
})
