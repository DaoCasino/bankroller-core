import { config } from "dc-configs";
import fs from "fs";
import path from "path";
import { DApp, GlobalGameLogicStore } from "dc-core";

import { Eth } from "dc-ethereum-utils";
import * as Utils from "dc-ethereum-utils";
import { IpfsTransportProvider } from "dc-messaging";
import { Logger } from "dc-logging";
import {
  getSubDirectoriee,
  loadLogic,
  saveFilesToNewDir,
  removeDir
} from "./FileUtils";
import { IBankroller, GameInstanceInfo } from "../intefaces/IBankroller";
/*
 * Lib constructor
 */
const logger = new Logger("Bankroller");
export default class Bankroller implements IBankroller {
  private _started: boolean;
  private _loadedDirectories: Set<string>;
  private _eth: Eth;
  gamesMap: Map<string, DApp>;
  id: string;

  constructor() {
    const {
      gasPrice: price,
      gasLimit: limit,
      web3HttpProviderUrl: httpProviderUrl,
      contracts,
      privateKey,
      faucetServerUrl
    } = config;
    this._eth = new Eth({
      httpProviderUrl,
      ERC20ContractInfo: contracts.ERC20,
      faucetServerUrl,
      gasParams: { price, limit },
      privateKey
    });
    this.gamesMap = new Map();
    this._loadedDirectories = new Set();
    this.tryLoadDApp = this.tryLoadDApp.bind(this);
    global["DCLib"] = new GlobalGameLogicStore();
  }

  async start() {
    if (this._started) {
      throw new Error("Bankroller allready started");
    }

    await this._eth.initAccount();
    const transportProvider = await IpfsTransportProvider.create();
    transportProvider.exposeSevice(
      this._eth.account().address.toLowerCase(),
      this
    );
    this._started = true;
    getSubDirectoriee(config.DAppsPath).forEach(this.tryLoadDApp);
  }
  async uploadGame(
    name: string,
    files: { fileName: string; fileData: Buffer | string }[]
  ) {
    const newDir = path.join(config.DAppsPath, name);
    saveFilesToNewDir(newDir, files);
    if (!(await this.tryLoadDApp(newDir))) {
      removeDir(newDir);
    }
  }
  getGames(): { name: string }[] {
    return Array.from(this.gamesMap.values()).map(dapp => dapp.getView());
  }
  getGameInstances(name: string): GameInstanceInfo[] {
    const dapp = this.gamesMap.get(name);
    if (!dapp) {
      throw new Error(`Game ${name} not found`);
    }
    return dapp.getInstancesView();
  }
  async tryLoadDApp(directoryPath: string): Promise<DApp | null> {
    if (this._loadedDirectories.has(directoryPath)) {
      throw new Error(`Directory ${directoryPath} allready loadeed`);
    }
    try {
      const { gameLogicFunction, manifest } = loadLogic(directoryPath);
      const roomProvider = await IpfsTransportProvider.create();

      if (gameLogicFunction) {
        const { slug, rules, contract } = manifest;
        const dapp = new DApp({
          slug,
          rules,
          contract,
          roomProvider,
          gameLogicFunction,
          Eth: this._eth
        });
        await dapp.startServer();
        this.gamesMap.set(slug, dapp);

        logger.debug({ message: `Load Dapp ${directoryPath}` });
        logger.debug({ message: `manifest ${manifest}` });

        return dapp;
      }
    } catch (error) {
      console.error({ message: `Error loading DApp.`, error });
    }
    return null;
  }
}
