jest.mock('../../src/logger')

import CiBase from '../../src/ci/base'
import TeamCity from '../../src/ci/teamcity'
import {ensureCiBaseMethodIsUsed} from './utils'

describe('CI / TeamCity', () => {
  let teamcity
  let ctx = {}

  beforeEach(() => {
    teamcity = new TeamCity({id: 'config'}, {id: 'vcs'})
    ctx.ci = teamcity
  })

  it('should save the config', () => {
    expect(teamcity.config).toEqual({id: 'config'})
  })

  it('should save the vcs', () => {
    expect(teamcity.vcs).toEqual({id: 'vcs'})
  })

  it('should extend CiBase', () => {
    expect(teamcity).toBeInstanceOf(CiBase)
  })

  ensureCiBaseMethodIsUsed(ctx, 'add')
  ensureCiBaseMethodIsUsed(ctx, 'commit')
  ensureCiBaseMethodIsUsed(ctx, 'push')
  ensureCiBaseMethodIsUsed(ctx, 'setupGitEnv')
})
