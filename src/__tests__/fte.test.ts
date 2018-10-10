import { IpfsTransportProvider } from 'dc-messaging';
import { config } from 'dc-configs';
import { Eth as Ethereum } from 'dc-ethereum-utils';
import Bankroller from '../dapps/Bankroller';
import { GlobalGameLogicStore, DApp } from 'dc-core';
import { Logger } from 'dc-logging';
const logger = new Logger('test1');

// const directTransportProvider = new DirectTransportProvider()
const startBankroller = async () => {
  try {
    const bankrollerTransportProvider = await IpfsTransportProvider.create();
    return await new Bankroller().start(bankrollerTransportProvider);
  } catch (error) {
    logger.debug(error);
    process.exit();
  }
};
const startGame = async () => {
  try {
    const gameTransportProvider = await IpfsTransportProvider.createAdditional();

    const {
      gasPrice: price,
      gasLimit: limit,
      web3HttpProviderUrl: httpProviderUrl,
      contracts,
      faucetServerUrl
    } = config;
    const Eth = new Ethereum({
      httpProviderUrl,
      ERC20ContractInfo: contracts.ERC20,
      faucetServerUrl,
      gasParams: { price, limit },
      privateKey:
        '0x6A5AE922FDE5C8EE877E9470F45B8030F60C19038E9116DB8B343782D9593602'
    });
    const slug = 'DCGame_FTE_v1';
    // Game loaded to store during bankroller start
    const gameLogicFunction = new GlobalGameLogicStore().getGameLogic(slug);
    const dappParams = {
      slug,
      contract: contracts.payChannelContract,
      rules: {
        depositX: 2
      },
      gameLogicFunction,
      roomProvider: gameTransportProvider,
      Eth
    };
    await Eth.initAccount();
    const dapp = new DApp(dappParams);
    const dappInstance = await dapp.startClient();
    return { game: dappInstance, Eth };
  } catch (error) {
    logger.debug(error);
    process.exit();
  }
};
const test1 = async () => {
  await startBankroller();
  const { game, Eth } = await startGame();
  const showFunc = (source, data) => {
    logger.debug(`${source} ${new Date().toString()} ${JSON.stringify(data)}`);
  };
  game.onPeerEvent('info', data => showFunc('Bankroller', data));
  game.on('info', data => showFunc('Client', data));
  await game.openChannel({
    playerAddress: Eth.account().address,
    playerDeposit: 3,
    gameData: [0, 0]
  });

  const result1 = await game.callPeerGame({
    userBet: 1,
    gameData: [1]
  });
  const result2 = await game.callPeerGame({
    userBet: 1,
    gameData: [2]
  });
  const result3 = await game.callPeerGame({
    userBet: 1,
    gameData: [3]
  });
};
test1();
