import { config } from "dc-configs"
import fs from "fs"
import path from "path"
import fetch from "node-fetch"
import { DApp, GlobalGameLogicStore } from "dc-core"
import { IMessagingProvider } from "dc-messaging"
import { Eth, buf2bytes32 } from "dc-ethereum-utils"
import { Logger } from "dc-logging"
import {
  getSubDirectories,
  checkFileExists,
  loadLogic,
  saveFilesToNewDir,
  removeDir
} from "./FileUtils"
import { EventEmitter } from "events"
import { IBankroller, GameInstanceInfo, GameUpload } from "../intefaces/IBankroller"
import { PingService } from "./PingService"
import { IPingService } from "../intefaces/IPingService"

const logger = new Logger("Bankroller:")

export default class Bankroller extends EventEmitter implements IBankroller {
  public static STATUS_SUCCESS: string = "ok"
  public static STATUS_FAILURE: string = "fail"
  private _started: boolean
  private _loadedDirectories: Set<string>
  private _eth: Eth
  private _apiRoomAddress
  private _platformId
  // private _platformIdHash
  private _blockchainNetwork
  gamesMap: Map<string, DApp>
  gamesPath: Map<string, string> // slug => directoryPath
  id: string
  private _transportProvider: IMessagingProvider
  private _pingService: IPingService
  constructor() {
    super()
    const { platformId, blockchainNetwork } = config.default
    this._platformId = platformId
    // this._platformIdHash = createHash(platformId)
    this._blockchainNetwork = blockchainNetwork

    this.gamesMap = new Map()
    this.gamesPath = new Map()
    this._loadedDirectories = new Set()
    // this.tryLoadDApp = this.tryLoadDApp.bind(this)
    // this.tryUnloadDApp = this.tryUnloadDApp.bind(this)
    ;(global as any).DCLib = new GlobalGameLogicStore()
  }

  getApiRoomAddress(ethAddress: string): string {
    return `${this._platformId}_${this._blockchainNetwork}_${ethAddress}`
  }

  getPlatformId(): string {
    return this._platformId
  }

  async start(transportProvider: IMessagingProvider): Promise<IBankroller> {
    const {
      platformId,
      gasPrice: price,
      gasLimit: limit,
      web3HttpProviderUrl: httpProviderUrl,

      walletName,
      blockchainNetwork,
      privateKey,
      getContracts
    } = config.default
    const ERC20ContractInfo = (await getContracts()).ERC20
    this._eth = new Eth({
      walletName,
      httpProviderUrl,
      ERC20ContractInfo,
      gasParams: { price, limit }
    })
    if (this._started) {
      throw new Error("Bankroller allready started")
    }

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

  isStarted(): boolean {
    return this._started
  }

  async stop(): Promise<boolean> {
    await this._pingService.stop()
    const status = await this._transportProvider.stopService(
      this._apiRoomAddress
    )
    if (status) {
      logger.info(`Bankroller stoped. Api address: ${this._apiRoomAddress}`)
      this._started = false
    }
    return status
  }

  async uploadGame({
    name,
    files,
    reload = false
  }: GameUpload): Promise<{ status: string }> {
    const DAppsPath: string = config.default.DAppsPath
    const newDir: string = path.join(DAppsPath, name)
    let status: string = Bankroller.STATUS_SUCCESS

    if (reload && this._loadedDirectories.has(newDir)) {
      await this.unloadGame(name)
    }

    if (this._loadedDirectories.has(newDir)) {
      throw new Error(`Directory ${newDir} allready created`)
    }

    if (!saveFilesToNewDir(newDir, files)) {
        throw new Error(`Error save files to ${newDir}`)
    }

    this._loadedDirectories.add(newDir)
    if (!(await this.tryLoadDApp(newDir))) {
      removeDir(newDir)
      this._loadedDirectories.delete(newDir)
      status = Bankroller.STATUS_FAILURE
    }
    return { status }
  }

  async unloadGame(name: string): Promise<{ status: string }> {
    const DAppsPath = config.default.DAppsPath
    const newDir = path.join(DAppsPath, name)
    let status = false
    if (await this.tryUnloadDApp(newDir)) {
      removeDir(newDir)
      this._loadedDirectories.delete(newDir)
      status = true
    }
    return { status: status ? Bankroller.STATUS_SUCCESS : Bankroller.STATUS_FAILURE  }
  }

  getGames(): { name: string, path: string }[] {
    const games = []
    for (const [slug, dapp] of this.gamesMap) {
      games.push({
        name: slug,
        path: this.gamesPath.get(slug)
      })
    }

    return games
  }

  getGameInstances(name: string): GameInstanceInfo[] {
    const dapp = this.gamesMap.get(name)
    if (!dapp) {
      throw new Error(`Game ${name} not found`)
    }
    return dapp.getInstancesView()
  }
  private async tryLoadDApp(directoryPath: string): Promise<DApp | null> {
    const now = Date.now()
    // if (this._loadedDirectories.has(directoryPath)) {
    //   throw new Error(`Directory ${directoryPath} allready loadeed`)
    // }
    try {
      const { gameLogicFunction, manifest } = await loadLogic(directoryPath)
      const roomProvider = this._transportProvider

      if (gameLogicFunction) {
        const {
          disabled,
          slug,
          rules,
          contract: manifestContract,
          getContract
        } = manifest

        if (manifest.disabled) {
          logger.debug(`DApp ${slug} disabled - skip`)
          return null
        }
        const contract =
          manifestContract || getContract(this._blockchainNetwork)
        // TODO this should be placed somewhere else
        if (contract.address && contract.address.indexOf("http") > -1) {
          contract.address = await fetch(contract.address.split("->")[0])
            .then(r => r.json())
            .then(r => r[contract.address.split("->")[1]])
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

        // Это нужно что бы использовать unloadGame удаленно
        const DAppsPath = config.default.DAppsPath
        this.gamesPath.set(slug, directoryPath.replace(DAppsPath, ''))

        logger.debug(`Load Dapp ${directoryPath}, took ${Date.now() - now} ms`)

        return dapp
      }
    } catch (error) {
      logger.debug(error)
    }
    return null
  }

  private async tryUnloadDApp(directoryPath: string): Promise<boolean> {
    if (!this._loadedDirectories.has(directoryPath)) {
      throw new Error(`Directory ${directoryPath} not loadeed`)
    }

    const now = Date.now()

    try {
      const { gameLogicFunction, manifest } = await loadLogic(directoryPath)
      if (gameLogicFunction) {
        const { disabled, slug } = manifest
        if (!disabled) {
          // const dapp = this.gamesMap.get(slug)
          // await dapp.stopServer() // TODO: !!! need code
          this.gamesMap.delete(slug)

          logger.debug(
            `Unload Dapp ${directoryPath}, took ${Date.now() - now} ms`
          )
        } else {
          logger.debug(`DApp ${slug} disabled - skip`)
        }

        return true
      }
    } catch (error) {
      logger.debug(error)
      return false
    }
  }
}
