import { Eth } from 'dc-ethereum-utils';
import _config from '../../config';

const { gasPrice: price, gasLimit: limit } = _config.network;
const eth = new Eth({
  httpProviderUrl: _config.network.rpc_url,
  ERC20ContractInfo: _config.network.contracts.erc20,
  faucetServerUrl: _config.faucet.get_acc_url,
  gasParams: { price, limit },
  privateKey: _config.privateKey
});

eth.initAccount();
