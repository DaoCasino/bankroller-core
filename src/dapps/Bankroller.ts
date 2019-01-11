import { config } from "@daocasino/dc-configs"
import path from "path"
import fetch from "node-fetch"
import { DApp, GlobalGameLogicStore } from "@daocasino/dc-core"
import { IMessagingProvider } from "@daocasino/dc-messaging"
import { Eth, buf2bytes32 } from "@daocasino/dc-ethereum-utils"
import { Logger } from "@daocasino/dc-logging"
import {
  getSubDirectories,
  checkFileExists,
  loadLogic,
  saveFilesToNewDir,
  removeDir
} from "./FileUtils"
import { EventEmitter } from "events"
import {
  IBankroller,
  GameInstanceInfo,
  GameUpload
} from "../intefaces/IBankroller"
import { PingService } from "./PingService"
import { IPingService } from "../intefaces/IPingService"

const logger = new Logger("Bankroller:")

export default class Bankroller extends EventEmitter implements IBankroller {
  public static STATUS_SUCCESS: string = "ok"
  public static STATUS_FAILURE: string = "fail"
  public static EVENT_UPLOAD_GAME: string = "uploadGame"
  public static EVENT_UNLOAD_GAME: string = "unloadGame"
  private _started: boolean
  private _loadedDirectories: Set<string>
  private _eth: Eth
  private _apiRoomAddress
  private _platformId
  // private _platformIdHash
  private _blockchainNetwork
  private _transportProvider: IMessagingProvider
  private _pingService: IPingService
  private _statisticsServerParams

  public gamesMap: Map<string, DApp>
  public gamesPath: Map<string, string> // slug => directoryPath
  public id: string

  constructor() {
    super()
    const { platformId, blockchainNetwork, statisticsServer } = config.default

    // this._platformIdHash = createHash(platformId)
    this._platformId = platformId
    this._blockchainNetwork = blockchainNetwork
    this._statisticsServerParams = statisticsServer

    this.gamesMap = new Map()
    this.gamesPath = new Map()
    this._loadedDirectories = new Set()
    // this.tryLoadDApp = this.tryLoadDApp.bind(this)
    // this.tryUnloadDApp = this.tryUnloadDApp.bind(this)
    ;(global as any).DCLib = new GlobalGameLogicStore()
  }

  private _getApiRoomAddress(ethAddress: string): string {
    return `${this._platformId}_${this._blockchainNetwork}_${ethAddress}`
  }

  getApiRoomAddress(): string {
    return this._apiRoomAddress
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
      contracts
    } = config.default
    const ERC20ContractInfo = contracts.ERC20
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
    //  check balance
    const balances = await this._eth.getBalances()
    if (balances.bet.balance === 0) {
      throw new Error(
        `Empty bet balance at address: ${this._eth.getAccount().address}`
      )
    }
    if (balances.eth.balance < 0.01) {
      throw new Error(
        `Not enough ETH balance at address: ${this._eth.getAccount().address}`
      )
    }

    const ethAddress = this._eth.getAccount().address.toLowerCase()
    this._apiRoomAddress = this._getApiRoomAddress(ethAddress)
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

    logger.info(
      `Bankroller started. Api address: \x1b[32m${this._apiRoomAddress}\x1b[0m`
    )

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
    return {
      status: status ? Bankroller.STATUS_SUCCESS : Bankroller.STATUS_FAILURE
    }
  }

  getGames(): { name: string; path: string }[] {
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

      if (typeof gameLogicFunction !== "function") {
        throw new Error("gameLogic is not a function")
      }

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

      let gameContractAddress =
        manifestContract || getContract(this._blockchainNetwork).address

      if (
        gameContractAddress.indexOf("->") > -1 &&
        this._blockchainNetwork === "local"
      ) {
        const { web3HttpProviderUrl } = config.default
        gameContractAddress = await fetch(
          `${web3HttpProviderUrl}/${gameContractAddress.split("->")[0]}`
        )
          .then(result => result.json())
          .then(result => result[gameContractAddress.split("->")[1]])
      }

      const dapp = new DApp({
        platformId: this._platformId,
        blockchainNetwork: this._blockchainNetwork,
        slug,
        rules,
        userAddress: this._eth.getAccount().address,
        gameLogicFunction,
        gameContractAddress,
        roomProvider,
        Eth: this._eth,
        statisticsClient: this._statisticsServerParams
      })

      await dapp.startServer()
      this.gamesMap.set(slug, dapp)

      // Это нужно что бы использовать unloadGame удаленно
      const DAppsPath = config.default.DAppsPath
      this.gamesPath.set(slug, directoryPath.replace(DAppsPath, ""))

      logger.debug(`Load Dapp ${directoryPath}, took ${Date.now() - now} ms`)

      // broadcast result to uploadGame
      this.emit(Bankroller.EVENT_UPLOAD_GAME, {
        name: slug,
        path: this.gamesPath.get(slug)
      })

      return dapp
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
          this.emit(Bankroller.EVENT_UNLOAD_GAME, {
            name: slug,
            path: this.gamesPath.get(slug)
          })
          this.gamesMap.delete(slug)
          this.gamesPath.delete(slug)

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

  eventNames() {
    return [Bankroller.EVENT_UNLOAD_GAME, Bankroller.EVENT_UPLOAD_GAME]
  }
}
