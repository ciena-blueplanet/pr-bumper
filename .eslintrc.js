const ERROR = 'error'
const WARN = 'warn'

module.exports = {
  extends: ['frost-standard'],
  overrides: [
    {
      files: ['src/**/*.js'],
      rules: {
        'flowtype/no-weak-types': [WARN],
        'flowtype/require-parameter-type': [ERROR]
      }
    }
  ],
  plugins: [
    'flowtype'
  ],
  settings: {
    flowtype: {
      onlyFilesWithFlowAnnotation: false
    }
  }
}
