const path = require('path')

let faucet_server = {}
let network
if (process.env.DC_NETWORK === 'sdk') {
  network = require('./configs/sdk/config.js')
} else if (process.env.DC_NETWORK === 'local') {
  network = require('./configs/local/config.js')
} else {
  network = require('./configs/ropsten/config.js')
}


let data_path = process.env.DATA_PATH || './data'

module.exports = {
  dappRoom    : process.env.DAPP_ROOM  || 'dapp_room_',
  privateKey  : process.env.privateKey || process.env.PRIVATE_KEY || false, 
  wallet_pass : '1234',

  loglevel: 'light',

  dapps_dir    : path.join(path.resolve(), ( process.env.DAPPS_PATH || (data_path + '/dapps/') )),
  network      : network
}
