import PayChannel from '../../lib/dapps/PayChannel'
const path = require('path')
const fs   = require('fs')

const filpath = path.resolve('../protocol/build/contracts.json')
if (!fs.existsSync(filpath)) {
  console.log('')
  console.log('')
  console.log('Cant find contracts_adressess ', filpath)
  console.log('')
  console.log('BANKROLLER NODE SHUT DOWN')
  console.log('')
  process.exit()
}

const conf = require(filpath)

const ERC20 = {
  address: conf.ERC20,
  abi: require( path.resolve('../protocol/build/contracts/ERC20.json') ).abi
}

module.exports = {
  name    : 'local',
  rpc_url : 'http://localhost:9545/',
  
  signal  : '/ip4/127.0.0.1/tcp/9090/ws/p2p-websocket-star/',
  
  contracts : {
    erc20 : ERC20
  },

  gasPrice : 40 * 1000000000,
  gasLimit : 40 * 100000
}
