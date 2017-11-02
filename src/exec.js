import {exec} from 'child_process'
import Promise from 'promise'

export default Promise.denodeify(exec)
