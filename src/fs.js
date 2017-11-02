import fs from 'fs'
import Promise from 'promise'

export const mkdir = Promise.denodeify(fs.mkdir)
export const readFile = Promise.denodeify(fs.readFile)
export const stat = Promise.denodeify(fs.stat)
export const writeFile = Promise.denodeify(fs.writeFile)
