import { config } from "dc-configs"
import fs from "fs"
import path from "path"
import fetch from "node-fetch"
import { DApp, GlobalGameLogicStore } from "dc-core"
import { IpfsTransportProvider, IMessagingProvider } from "dc-messaging"
import { Eth } from "dc-ethereum-utils"
import { Logger } from "dc-logging"
import {
  getSubDirectories,
  loadLogic,
  saveFilesToNewDir,
  removeDir
} from "./FileUtils"
import { EventEmitter } from "events"

// import crypto from "crypto"

import { IBankroller, GameInstanceInfo } from "../intefaces/IBankroller"

import { PingService } from "./PingService"
import { IPingService } from "../intefaces/IPingService"

const logger = new Logger("Bankroller:")

export default class Bankroller extends EventEmitter implements IBankroller {
  private _started: boolean
  private _loadedDirectories: Set<string>
  private _eth: Eth
  private _apiRoomAddress
  private _platformId
  // private _platformIdHash
  private _blockchainNetwork
  gamesMap: Map<string, DApp>
  id: string
  private _transportProvider: IMessagingProvider
  private _pingService: IPingService
  constructor() {
    super()
    const {
      platformId,
      gasPrice: price,
      gasLimit: limit,
      web3HttpProviderUrl: httpProviderUrl,
      contracts,
      walletName,
      blockchainNetwork
    } = config.default
    this._platformId = platformId
    // this._platformIdHash = createHash(platformId)
    this._blockchainNetwork = blockchainNetwork
    this._eth = new Eth({
      walletName,
      httpProviderUrl,
      ERC20ContractInfo: contracts.ERC20,
      gasParams: { price, limit }
    })

    this.gamesMap = new Map()
    this._loadedDirectories = new Set()
    this.tryLoadDApp = this.tryLoadDApp.bind(this)
    ;(global as any).DCLib = new GlobalGameLogicStore()
  }
  getApiRoomAddress(ethAddress: string) {
    return `${this._platformId}_${this._blockchainNetwork}_${ethAddress}`
  }
  getPlatformId(): string {
    return this._platformId
  }
  async start(transportProvider: IMessagingProvider): Promise<any> {
    if (this._started) {
      throw new Error("Bankroller allready started")
    }
    const { privateKey } = config.default
    this._transportProvider = transportProvider

    await this._eth.initAccount(privateKey)
    await this._eth.saveWallet(privateKey)
    const ethAddress = this._eth.getAccount().address.toLowerCase()

    this._apiRoomAddress = this.getApiRoomAddress(ethAddress)
    transportProvider.exposeSevice(this._apiRoomAddress, this, true)

    this._pingService = new PingService().start(transportProvider, {
      platformId: this._platformId,
      apiRoomAddress: this._apiRoomAddress,
      blockchainNetwork: this._blockchainNetwork,
      ethAddress
    })
    // transportProvider.exposeSevice(this.getPlatformIdHash(), PingService, true)
    this._started = true

    const subDirectories = getSubDirectories(config.default.DAppsPath)
    for (let i = 0; i < subDirectories.length; i++) {
      await this.tryLoadDApp(subDirectories[i])
    }

    logger.info(`Bankroller started. Api address: ${this._apiRoomAddress}`)

    const stopBankroller = async () => {
      const status = await this.stop()
      process.exit(status ? 0 : 1)
    }
    process.on("SIGTERM", stopBankroller)
    process.on("SIGINT", stopBankroller)

    return this
  }

  async stop(): Promise<boolean> {
    await this._pingService.stop()
    const status = await this._transportProvider.stopService(
      this._apiRoomAddress
    )
    logger.info(`Bankroller stoped. Api address: ${this._apiRoomAddress}`)
    return status
  }

  async uploadGame({
    name,
    files
  }: {
    name: string
    files: { fileName: string; fileData: Buffer | string }[]
  }): Promise<{ status: string }> {
    const DAppsPath = config.default.DAppsPath
    const newDir = path.join(DAppsPath, name)
    saveFilesToNewDir(newDir, files)
    if (!(await this.tryLoadDApp(newDir))) {
      removeDir(newDir)
    }
    return { status: "ok" }
  }

  getGames(): { name: string }[] {
    return Array.from(this.gamesMap.values()).map(dapp => dapp.getView())
  }

  getGameInstances(name: string): GameInstanceInfo[] {
    const dapp = this.gamesMap.get(name)
    if (!dapp) {
      throw new Error(`Game ${name} not found`)
    }
    return dapp.getInstancesView()
  }
  async tryLoadDApp(directoryPath: string): Promise<DApp | null> {
    const now = Date.now()
    if (this._loadedDirectories.has(directoryPath)) {
      throw new Error(`Directory ${directoryPath} allready loadeed`)
    }
    try {
      const { gameLogicFunction, manifest } = loadLogic(directoryPath)
      const roomProvider = this._transportProvider

      if (gameLogicFunction) {
        const {
          disabled,
          slug,
          rules,
          contract: manifestVontract,
          getContract
        } = manifest

        if (manifest.disabled) {
          logger.debug(`DApp ${slug} disabled - skip`)
          return null
        }
        const contract =
          manifestVontract || getContract(this._blockchainNetwork)


        if (contract.address && contract.address.indexOf('http') > -1) {
          contract.address = await fetch(contract.address.split('->')[0])
          .then( r => r.json() )
          .then( r => r[contract.address.split('->')[1]] )
        }

        const dapp = new DApp({
          platformId: this._platformId,
          blockchainNetwork: this._blockchainNetwork,
          slug,
          rules,
          contract,
          roomProvider,
          gameLogicFunction,
          Eth: this._eth
        })

        await dapp.startServer()
        this.gamesMap.set(slug, dapp)

        logger.debug(`Load Dapp ${directoryPath}, took ${Date.now() - now} ms`)

        return dapp
      }
    } catch (error) {
      logger.debug(error)
    }
    return null
  }
}
