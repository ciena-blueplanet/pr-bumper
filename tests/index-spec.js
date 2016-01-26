'use strict';

const expect = require('chai').expect
const lib = require('../lib')

describe('lib', () => {
  describe('integration', () => {
    let myScope, myError
    beforeEach((done) => {
      lib.getSha()
        .then((sha) => {
          return lib.getPrForSha('ciena-blueplanet', 'github-pr-bump', sha)
        })
        .then(lib.getScopeForPr)
        .then((scope) => {
          myScope = scope
          done()
        })
        .catch((e) => {
          myError = e
          console.log(`${e}`)
          done()
        })
    })

    it('does not error', () => {
      expect(myError).to.be.null
    })

    it('fetches the right pr', () => {
      expect(myScope).to.be.equal('patch')
    })
  })

  describe('.getSha()', () => {

  })

  describe('.getPrSha()', () => {

  })
})

