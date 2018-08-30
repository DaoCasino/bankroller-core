const path = require('path')
const fs   = require('fs')

const erc20Path      = path.resolve(__dirname, '../..', './protocol/addresses.json')
const paychannelPath = path.resolve(__dirname, '../..', './protocol/dapp.contract.json')

if (!fs.existsSync(erc20Path) || !fs.existsSync(paychannelPath)) {
  console.log('')
  console.log('')
  console.log('Cant find contracts please start dc-scripts start -p')
  console.log('')
  console.log('BANKROLLER NODE SHUT DOWN')
  console.log('')
  process.exit()
}

const erc20contract      = require(erc20Path)
const paychannelContract = require(paychannelPath)

const ERC20 = {
  address : erc20contract.ERC20,
  abi     : require(path.resolve(__dirname, '../..', './protocol/contracts/ERC20.json')).abi
}

const paychannel = {
  address : paychannelContract.address,
  abi     : paychannelContract.abi
}

module.exports = {
  name    : 'local',
  rpc_url : 'http://localhost:1406/',

  signal  : [
    '/dns4/signal2.dao.casino/tcp/443/wss/p2p-websocket-star/',
    '/dns4/signal3.dao.casino/tcp/443/wss/p2p-websocket-star/',
  ],

  contracts : {
    erc20      : ERC20,
    paychannel : paychannel
  },

  gasPrice : 40 * 1000000000,
  gasLimit : 40 * 100000
}
