'use strict';

const expect = require('chai').expect
const lib = require('../lib')

describe('lib', () => {
  describe('integration', () => {
    let myPr
    beforeEach((done) => {
      lib.getSha()
        .then((sha) => {
          console.log(`sha [${sha}]`)
          return lib.getPrForSha('ciena-blueplanet', 'github-pr-bump', sha)
        })
        .then((pr) => {
          myPr = pr
          done()
        })
        .catch((e) => {
          console.log(`Error: ${e}`)
          done()
        })
    })

    it('fetches the right pr', () => {
      expect(pr.body).to.be.equal('foo-bar')
    })
  })

  describe('.getSha()', () => {

  })

  describe('.getPrSha()', () => {

  })
})

