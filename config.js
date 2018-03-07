const path = require('path')

let network
if (process.env.DC_NETWORK==='local') {
	network = require('./configs/local/config.js')
} else {
	network = require('./configs/ropsten/config.js')
}


module.exports = {
  wallet_pass : '1234',
  loglevel: 'light',

  dapps_dir: path.join(path.resolve(), './data/dapps/'),
  network: network
}
