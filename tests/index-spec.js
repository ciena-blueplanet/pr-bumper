'use strict'

const expect = require('chai').expect
const lib = require('../lib')

describe('index', () => {
  it('exports Bumper', () => {
    expect(lib.Bumper).to.be.ok
  })

  it('exports GitHub', () => {
    expect(lib.GitHub).to.be.ok
  })
})
