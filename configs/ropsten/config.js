
module.exports = {
  name    : 'ropsten',
  rpc_url : 'https://ropsten.infura.io/JCnK5ifEPH9qcQkX0Ahl',

  contracts: {
    erc20      : require('./contracts/erc20.js'),
    paychannel : require('./contracts/paychannel.js')
  },

  gasPrice : 40 * 1000000000,
  gasLimit : 40 * 100000
}
