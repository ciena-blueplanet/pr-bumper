'use strict'

const chai = require('chai')
const sinonChai = require('sinon-chai')
const expect = chai.expect
chai.use(sinonChai)

const CiBase = require('../../lib/ci/base')

module.exports = {
  ensureCiBaseMethodIsUsed (ctx, methodName) {
    describe(`.${methodName}()`, function () {
      let ci, result

      beforeEach(function () {
        ci = ctx.ci
        ctx.sandbox.stub(CiBase.prototype, methodName).returns(Promise.resolve(`${methodName}-finished`))

        return ci[methodName]('some-args').then((res) => {
          result = res
        })
      })

      it(`should call the base ${methodName}()`, function () {
        expect(CiBase.prototype[methodName]).to.have.been.calledWith('some-args')
      })

      it(`should resolve with the result of the base ${methodName}()`, function () {
        expect(result).to.equal(`${methodName}-finished`)
      })
    })
  }
}
