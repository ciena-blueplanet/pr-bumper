import prependFile from 'prepend-file'
import Promise from 'promise'

export default Promise.denodeify(prependFile)
