import { IpfsTransportProvider, DirectTransportProvider } from "dc-messaging"
import { config } from "dc-configs"
import { Eth as Ethereum } from "dc-ethereum-utils"

import { GlobalGameLogicStore, DApp, DAppFactory } from "dc-core"
import Bankroller from "../dapps/Bankroller"
import { Logger } from "dc-logging"
import { loadLogic } from "../dapps/FileUtils"
import { describe, it, Test } from "mocha"
import { expect } from "chai"

const logger = new Logger("test1")

const startGame = async () => {
  const transportProvider = await IpfsTransportProvider.create()

  let manifestFile = config.DAppsPath + "/FTE1/dapp.manifest.js"
  let privkey =
    "0x6A5AE922FDE5C8EE877E9470F45B8030F60C19038E9116DB8B343782D9593602"
  // local env
  if (process.env.DC_NETWORK === "local") {
    manifestFile = config.DAppsPath + "/ex1/dapp.manifest.js"
    privkey =
      "0xae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f"
  }
  // const game = new DAppFactory(transportProvider).startClient({ name: "game1" , })
  const dappManifest = require(manifestFile)

  const {
    gasPrice: price,
    gasLimit: limit,
    web3HttpProviderUrl: httpProviderUrl,
    contracts,
    platformId,
    blockchainNetwork
  } = config
  const Eth = new Ethereum({
    httpProviderUrl,
    ERC20ContractInfo: contracts.ERC20,
    gasParams: { price, limit }
  })

  // Game loaded to store during bankroller start
  const gameLogicFunction = new GlobalGameLogicStore().getGameLogic(
    dappManifest.slug
  )
  const dappParams = {
    slug: dappManifest.slug,
    platformId,
    blockchainNetwork,
    contract: dappManifest.contract,
    rules: dappManifest.rules,
    roomProvider: transportProvider,
    gameLogicFunction,
    Eth
  }
  await Eth.initAccount(privkey)
  const dapp = new DApp(dappParams)
  const dappInstance = await dapp.startClient()
  return { game: dappInstance, Eth }
}

describe("Bankroller Tests", () => {
  it("game with remote bankroller", async () => {
    await startGame()
  })
})
