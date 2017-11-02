import nlf from 'nlf'
import Promise from 'promise'

export const find = Promise.denodeify(nlf.find)
