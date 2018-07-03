const path = require('path')

let faucet_server = {}
let network
if (process.env.DC_NETWORK === 'local') {
  network = require('./configs/local/config.js')
  faucet_server.get_acc_url = 'http://localhost:8181/?get=account'
} else {
  network = require('./configs/ropsten/config.js')
  // faucet_server.get_acc_url = 'https://platform.dao.casino/faucet?get=account'
  faucet_server.get_acc_url = 'https://platform.dao.casino/faucet2?get=account'
}


module.exports = {
  wallet_pass : '1234',
  loglevel: 'light',

  faucet : faucet_server,

  data_subpath : process.env.DATA_SUBPATH,
  dapps_dir    : path.join(path.resolve(), ( process.env.DAPPS_PATH || './data/dapps/' )),
  network      : network
}
