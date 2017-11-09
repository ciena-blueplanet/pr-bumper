'use strict'

require('../typedefs')

const CiBase = require('./base')

/**
 * CI interface for Bamboo Server
 *
 * @class
 * @implements {Ci}
 */
class Bamboo extends CiBase {}

module.exports = Bamboo
