const fs   = require('fs')
const path = require('path')

const protocolContracts = path.join(__dirname, '../..', 'protocol/addresses.json')
const paychannelPath    = path.join(__dirname, '../..', 'protocol/dapp.contract.json')

if (!fs.existsSync(protocolContracts) || !fs.existsSync(paychannelPath)) {
  console.log('')
  console.log('')
  console.log('Cant find contracts_adressess ', protocolContracts, 'or', paychannelPath)
  console.log('')
  console.log('BANKROLLER NODE SHUT DOWN')
  console.log('')
  process.exit()
}

const conf       = require(protocolContracts)
const paychannel = require(paychannelPath)

const ERC20 = Object.freeze({
  address : conf.ERC20,
  abi     : require(path.join(__dirname, '../..', 'protocol/contracts/ERC20.json')).abi
})

const paychannelContract = Object.freeze({
  address : paychannel.address,
  abi     : paychannel.abi
})

module.exports = {
  name    : 'sdk',
  rpc_url : process.env.rpc_url || 'http://dc_protocol:8545/',

  signal  : [
    process.env.signal || '/dns4/dc_signal/tcp/1407/ws/p2p-websocket-star/',
  ],

  contracts : {
    erc20      : ERC20,
    paychannel : paychannelContract
  },

  gasPrice : process.env.gasPrice || 40 * 1000000000,
  gasLimit : process.env.gasLimit || 40 * 100000
}
