const ropsten = require('./configs/ropsten/config.js')
const path    = require('path')

module.exports = {
  wallet_pass : '1234',
  loglevel: 'light',

  dapps_dir: path.join(path.resolve(), './data/dapps/'),
  network:ropsten
}
