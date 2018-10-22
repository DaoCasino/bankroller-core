import { config } from "dc-configs"
import fs from "fs"
import path from "path"
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

import { IBankroller, GameInstanceInfo } from "../intefaces/IBankroller"
/*
 * Lib constructor
 */

const logger = new Logger("Bankroller:")

export default class Bankroller extends EventEmitter implements IBankroller {
  private _started: boolean
  private _loadedDirectories: Set<string>
  private _eth: Eth
  private _apiRoomAddress
  private _platformId
  private _blockchainNetwork
  gamesMap: Map<string, DApp>
  id: string
  private _transportProvider: IMessagingProvider
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
    } = config
    this._platformId = platformId
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
  async start(transportProvider: IMessagingProvider): Promise<any> {
    if (this._started) {
      throw new Error("Bankroller allready started")
    }
    const { privateKey } = config
    this._transportProvider = transportProvider
    await this._eth.initAccount(privateKey)
    const ethAddress = this._eth.getAccount().address.toLowerCase()

    this._apiRoomAddress = this.getApiRoomAddress(ethAddress)
    transportProvider.exposeSevice(this._apiRoomAddress, this, true)
    this._started = true

    const subDirectories = getSubDirectories(config.DAppsPath)
    for (let i = 0; i < subDirectories.length; i++) {
      await this.tryLoadDApp(subDirectories[i])
    }

    logger.info(`Bankroller started. Api address: ${this._apiRoomAddress}`)
    return this
  }

  async uploadGame({
    name,
    files
  }: {
    name: string
    files: { fileName: string; fileData: Buffer | string }[]
  }): Promise<{ status: string }> {
    const DAppsPath = config.DAppsPath
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
        const { disabled, slug, rules, contract, getContract } = manifest

        if (manifest.disabled) {
          logger.debug(`DApp ${slug} disabled - skip`)
          return null
        }

        const dapp = new DApp({
          platformId: this._platformId,
          blockchainNetwork: this._blockchainNetwork,
          slug,
          rules,
          contract: contract || getContract(this._blockchainNetwork),
          roomProvider,
          gameLogicFunction,
          Eth: this._eth
        })

        logger.debug(contract.address)

        await dapp.startServer()
        this.gamesMap.set(slug, dapp)

        logger.debug(`Load Dapp ${directoryPath}, took ${Date.now() - now} ms`)

        return dapp
      }
    } catch (error) {
      console.log(error)
    }
    return null
  }
}
