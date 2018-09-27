const fs   = require('fs')
const path = require('path')

const protocolContracts = path.resolve('../../protocol/addresses.json')
if (!fs.existsSync(protocolContracts)) {
  console.log('')
  console.log('')
  console.log('Cant find contracts_adressess ', protocolContracts)
  console.log('')
  console.log('BANKROLLER NODE SHUT DOWN')
  console.log('')
  process.exit()
}

const conf = require(protocolContracts)

const ERC20 = Object.freeze({
  address : conf.ERC20,
  abi     : require(path.resolve('../../protocol/contracts/ERC20.json')).abi
})

module.exports = {
  name    : 'sdk',
  rpc_url : process.env.rpc_url || 'http://dc_protocol:8545/',

  contracts : {
    erc20 : ERC20
  },

  gasPrice : process.env.gasPrice * 1 || 40 * 1000000000,
  gasLimit : process.env.gasLimit * 1 || 40 * 100000
}
