const path = require('path')

let faucet_server = {}
let network
if (process.env.DC_NETWORK === 'sdk') {
  network = require('./configs/sdk/config.js')
  faucet_server.get_acc_url = false
} else if (process.env.DC_NETWORK === 'local') {
  network = require('./configs/local/config.js')
  faucet_server.get_acc_url = 'http://localhost:8181/?get=account'
} else {
  network = require('./configs/ropsten/config.js')
  faucet_server.get_acc_url = 'https://stage.dao.casino/faucet/?get=account'
  
  if(process.env.NODE_ENV === 'production') {
    faucet_server.get_acc_url = 'https://faucet.dao.casino/?get=account'
  }
}


let data_path = process.env.DATA_PATH || './data'

module.exports = {
  wallet_pass : '1234',
  loglevel: 'light',

  faucet : faucet_server,

  dapps_dir    : path.join(path.resolve(), ( process.env.DAPPS_PATH || (data_path + '/dapps/') )),
  network      : network
}
