
module.exports = {
  name    : 'ropsten',
  rpc_url : 'https://ropsten.infura.io/JCnK5ifEPH9qcQkX0Ahl',

  // signal  : '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
  signal  : '/ip4/46.101.244.101/tcp/9090/ws/p2p-websocket-star/',
  // signal  : '/ip4/146.185.173.84/tcp/9090/ws/p2p-websocket-star/',

  contracts: {
    erc20      : require('./contracts/erc20.js'),
    paychannel : require('./contracts/paychannel.js')
  },

  gasPrice : 40 * 1000000000,
  gasLimit : 40 * 100000
}
