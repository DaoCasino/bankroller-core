import { Eth } from 'dc-ethereum-utils'
import _config from '../../config'

const { gasPrice: price, gasLimit: limit } = _config.network
const eth = new Eth({
  privateKey        : _config.privateKey,
  httpProviderUrl   : _config.network.rpc_url,
  ERC20ContractInfo : _config.network.contracts.erc20,
  gasParams         : { price, limit }
})

eth.initAccount()
