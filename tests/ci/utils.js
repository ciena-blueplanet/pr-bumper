'use strict'

const CiBase = require('../../lib/ci/base')
const expect = require('chai').expect

module.exports = {
  ensureCiBaseMethodIsUsed (ctx, methodName) {
    describe(`.${methodName}()`, () => {
      let ci, result
      beforeEach(() => {
        ci = ctx.ci
        ctx.sandbox.stub(CiBase.prototype, methodName).returns(Promise.resolve(`${methodName}-finished`))

        return ci[methodName]('some-args').then((res) => {
          result = res
        })
      })

      it(`calls the base ${methodName}()`, () => {
        expect(CiBase.prototype[methodName].lastCall.args).to.be.eql(['some-args'])
      })

      it(`resolves with the result of the base ${methodName}()`, () => {
        expect(result).to.be.equal(`${methodName}-finished`)
      })
    })
  }
}
