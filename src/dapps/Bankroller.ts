import { config } from 'dc-configs'
import fs   from 'fs'
import path from 'path'
import { DApp, GlobalGameLogicStore } from 'dc-core'
import { IpfsTransportProvider, IMessagingProvider } from 'dc-messaging'
import { Eth }    from 'dc-ethereum-utils'
import { Logger } from 'dc-logging'
import {
  getSubDirectoriee,
  loadLogic,
  saveFilesToNewDir,
  removeDir,
} from './FileUtils'

import { IBankroller, GameInstanceInfo } from '../intefaces/IBankroller'
/*
 * Lib constructor
 */

const logger = new Logger('Bankroller')
const addressPrefix = 'Bankroller'

export default class Bankroller implements IBankroller {
  private _started: boolean
  private _loadedDirectories: Set<string>
  private _eth: Eth
  gamesMap: Map<string, DApp>
  id: string
  private _transportProvider: IMessagingProvider
  constructor() {
    const {
      gasPrice: price,
      gasLimit: limit,
      web3HttpProviderUrl: httpProviderUrl,
      contracts,
      privateKey,
    } = config

    this._eth = new Eth({
      privateKey,
      httpProviderUrl,
      ERC20ContractInfo: contracts.ERC20,
      gasParams: { price, limit },
    })

    this.gamesMap           = new Map()
    this._loadedDirectories = new Set()
    this.tryLoadDApp        = this.tryLoadDApp.bind(this)
    ;(global as any).DCLib  = new GlobalGameLogicStore()
  }

  async start(transportProvider: IMessagingProvider) {
    if (this._started) {
      throw new Error('Bankroller allready started')
    }
    this._transportProvider = transportProvider
    await this._eth.initAccount()

    transportProvider.exposeSevice(
      this._eth.getAccount().address.toLowerCase(),
      this,
      true
    )
    this._started = true
    const loadDirPromises = getSubDirectoriee(config.DAppsPath).map(
      this.tryLoadDApp
    )
    await Promise.all(loadDirPromises)
    return this
  }

  async uploadGame(
    name: string,
    files: { fileName: string; fileData: Buffer | string }[]
  ) {
    const newDir = path.join(config.DAppsPath, name)
    saveFilesToNewDir(newDir, files)
    if (!(await this.tryLoadDApp(newDir))) {
      removeDir(newDir)
    }
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
        const { slug, rules, contract } = manifest
        const dapp = new DApp({
          slug,
          rules,
          contract,
          roomProvider,
          gameLogicFunction,
          Eth: this._eth,
        })
        await dapp.startServer()
        this.gamesMap.set(slug, dapp)

        logger.debug(`Load Dapp ${directoryPath}, took ${Date.now() - now} ms`)

        return dapp
      }
    } catch (error) {
      logger.error({ message: `Error loading DApp.`, error })
    }
    return null
  }
}
