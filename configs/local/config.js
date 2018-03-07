const path = require('path')
const fs   = require('fs')

const filpath = path.resolve('../protocol/build/contracts_adressess.json')
if (!fs.existsSync(filpath)) {
	console.log('')
	console.log('')
	console.log('Cant find contracts_adressess ', filpath)
	console.log('')
	console.log('BANKROLLER NODE SHUT DOWN')
	console.log('')
	proccess.exit()
}

const conf = require(filpath)


// {
// 	address:
// 	abi:
// }

module.exports = {
  upd     : '07.03.2018',
  name    : 'local',
  rpc_url : 'https://localhost:9545/',

  contracts : {
    erc20      : require('./contracts/erc20.js'),
    paychannel : require('./contracts/paychannel.js')
  },

  gasPrice : 40 * 1000000000,
  gasLimit : 40 * 100000
}
