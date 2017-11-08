/**
 * @flow
 */

import prependFile from 'prepend-file'
import Promise from 'promise'

const prepend: (
  filename: string,
  data: Buffer | string,
  options?: {|
    encoding?: ?string,
    mode?: number
  |}
) => Promise<void, Error> = Promise.denodeify(prependFile)

export default prepend
