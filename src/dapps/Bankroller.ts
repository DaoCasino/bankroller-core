import _config from "../../config";
import fs from "fs";
import path from "path";
import { DApp } from "./DApp";

import GlobalGameLogicStore from "./GlobalGameLogicStore";
import { Eth } from "dc-ethereum-utils";
import * as Utils from "dc-ethereum-utils";

import { IpfsTransportProvider } from "dc-messaging";
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

export default class Bankroller implements IBankroller {
  private _started: boolean;
  private _loadedDirectories: Set<string>;
  private _eth: Eth;
  gamesMap: Map<string, DApp>;
  id: string;

  constructor() {
    const { gasPrice: price, gasLimit: limit } = _config.network;
    this._eth = new Eth({
      httpProviderUrl: _config.network.rpc_url,
      ERC20ContractInfo: _config.network.contracts.erc20,
      faucetServerUrl: _config.faucet.get_acc_url,
      gasParams: { price, limit }
    });
    this.gamesMap = new Map();
    this.id = _config.network.contracts.erc20.address;
    global["DCLib"] = new GlobalGameLogicStore();
  }

  async start() {
    if (this._started) {
      throw new Error("Bankroller allready started");
    }
    await this._eth.initAccount();
    (await IpfsTransportProvider.create()).exposeSevice(
      this._eth.account().address,
      this
    );
    this._started = true;
    getSubDirectoriee(_config.dapps_dir).forEach(this.tryLoadDApp);
  }
  async uploadGame(
    name: string,
    files: { fileName: string; fileData: Buffer | string }[]
  ) {
    const newDir = path.join(_config.dapps_dir, name);
    saveFilesToNewDir(newDir, files);
    if (!(await this.tryLoadDApp(newDir))) {
      removeDir(newDir);
    }
  }
  getGames(): { name: string }[] {
    return Array.from(this.gamesMap.values()).map(dapp => dapp.getView);
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
      const { logic, manifest } = loadLogic(directoryPath);
      const roomProvider = await IpfsTransportProvider.create();

      if (logic) {
        const { slug, rules, contract } = manifest;
        const dapp = new DApp({
          slug,
          rules,
          contract,
          roomProvider,
          Eth: this._eth
        });
        await dapp.start();
        this.gamesMap.set(slug, dapp);
        Utils.debugLog("", _config.loglevel);
        Utils.debugLog("", _config.loglevel);
        Utils.debugLog(["Load Dapp ", directoryPath], _config.loglevel);
        Utils.debugLog(manifest, _config.loglevel);
        Utils.debugLog("", _config.loglevel);
        return dapp;
      }
    } catch (error) {
      console.error(error);
    }
    return null;
  }
}
