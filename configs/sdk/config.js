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
  address : conf.ERC20,
  abi     : require(path.resolve('../protocol/build/contracts/ERC20.json')).abi
}

module.exports = {
  name    : 'sdk',
  rpc_url : 'http://dc_ganache_testrpc:8545/',

  signal  : '/dns4/signal3.dao.casino/tcp/443/wss/p2p-websocket-star/',

  contracts : {
    erc20 : ERC20,
    paychannelContract: (function () {
      try {
        return JSON.parse(require(path.resolve('./data_sdk/dapps/dapp1/dapp.contract.json')))
      } catch (e) {
        return false
      }
    })()
  },

  gasPrice : 40 * 1000000000,
  gasLimit : 40 * 100000
}
