import deepFreeze from '../src/deep-freeze'

describe('deepFreeze', () => {
  it('should freeze array', () => {
    const array = [1]
    const frozen = deepFreeze(array)
    expect(frozen).toEqual(array)
    expect(() => {
      frozen.push(2)
    }).toThrow()
  })

  it('should freeze object', () => {
    const object = {foo: 'bar'}
    const frozen = deepFreeze(object)
    expect(frozen).toEqual(object)
    expect(() => {
      frozen.foo = 'spam'
    }).toThrow()
  })

  it('should freeze array nested within array', () => {
    const array1 = [1]
    const array2 = [array1]
    const frozen = deepFreeze(array2)
    expect(frozen).toEqual(array2)
    expect(() => {
      frozen[0].push(2)
    }).toThrow()
  })

  it('should freeze object nested within array', () => {
    const object = {foo: 'bar'}
    const array = [object]
    const frozen = deepFreeze(array)
    expect(frozen).toEqual(array)
    expect(() => {
      frozen[0].foo = 'baz'
    }).toThrow()
  })

  it('should freeze array nested within object', () => {
    const array = [1]
    const object = {foo: array}
    const frozen = deepFreeze(object)
    expect(frozen).toEqual(object)
    expect(() => {
      frozen.foo.push(2)
    }).toThrow()
  })

  it('should freeze object nested within object', () => {
    const object1 = {foo: 'bar'}
    const object2 = {baz: object1}
    const frozen = deepFreeze(object2)
    expect(frozen).toEqual(object2)
    expect(() => {
      frozen.baz.foo = 'spam'
    }).toThrow()
  })
})
