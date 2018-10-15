import { IpfsTransportProvider, DirectTransportProvider } from "dc-messaging"
import { config } from "dc-configs"
import { Eth as Ethereum } from "dc-ethereum-utils"

import { GlobalGameLogicStore, DApp } from "dc-core"
import Bankroller from "../dapps/Bankroller"
import { Logger } from "dc-logging"
import { loadLogic } from "../dapps/FileUtils"

const logger = new Logger("test1")

const directTransportProvider = new DirectTransportProvider()
const startBankroller = async () => {
  try {
    const bankrollerTransportProvider = directTransportProvider // await IpfsTransportProvider.create()
    return await new Bankroller().start(bankrollerTransportProvider)
  } catch (error) {
    logger.debug(error)
    process.exit()
  }
}
const startGame = async () => {
  try {
    const gameTransportProvider = directTransportProvider // await IpfsTransportProvider.createAdditional()

    // ropsten env
    let manifestFile = config.DAppsPath + "/FTE1/dapp.manifest.js"
    let privkey =
      "0x6A5AE922FDE5C8EE877E9470F45B8030F60C19038E9116DB8B343782D9593602"
    // local env
    if (process.env.DC_NETWORK === "local") {
      manifestFile = config.DAppsPath + "/ex1/dapp.manifest.js"
      privkey =
        "0xae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f"
    }

    const dappManifest = require(manifestFile)

    const {
      gasPrice: price,
      gasLimit: limit,
      web3HttpProviderUrl: httpProviderUrl,
      contracts,
      platformId
    } = config
    const Eth = new Ethereum({
      httpProviderUrl,
      ERC20ContractInfo: contracts.ERC20,
      gasParams: { price, limit },
      privateKey: privkey
    })

    // Game loaded to store during bankroller start
    const gameLogicFunction = new GlobalGameLogicStore().getGameLogic(
      dappManifest.slug
    )
    const dappParams = {
      slug: dappManifest.slug,
      platformId,
      contract: dappManifest.contract,
      rules: dappManifest.rules,
      roomProvider: gameTransportProvider,
      gameLogicFunction,
      Eth
    }
    await Eth.initAccount()
    const dapp = new DApp(dappParams)
    const dappInstance = await dapp.startClient()
    return { game: dappInstance, Eth }
  } catch (error) {
    logger.debug(error)
    process.exit()
  }
}
const test1 = async () => {
  await startBankroller()
  const { game, Eth } = await startGame()
  const showFunc = (source, data) => {
    logger.debug(`${source} ${new Date().toString()} ${JSON.stringify(data)}`)
  }
  game.onPeerEvent("info", data => showFunc("Bankroller", data))
  game.on("info", data => showFunc("Client", data))
  await game.openChannel({
    playerAddress: Eth.getAccount().address,
    playerDeposit: 3,
    gameData: [0, 0]
  })

  logger.info("Channel opened!")

  const result1 = await game.callPeerGame({
    userBet: 1,
    gameData: [1]
  })
  const result2 = await game.callPeerGame({
    userBet: 1,
    gameData: [2]
  })
  const result3 = await game.callPeerGame({
    userBet: 1,
    gameData: [3]
  })

  logger.info("Start close channel")

  game.closeChannel()
}
test1()
