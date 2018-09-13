import _config from "../../config";
import fs from "fs";
import path from "path";
import { DApp } from "./DApp";
import Eth from "../Eth";
import GlobalGameLogicStore from "./GlobalGameLogicStore";
import * as Utils from "../utils";
import PayChannelLogic from "./PayChannelLogic";
import { IpfsTransportProvider } from "dc-messaging";
import {
  getSubDirectoriee,
  loadLogic,
  saveFilesToNewDir,
  removeDir
} from "./FileUtils";
/*
 * Lib constructor
 */

interface IBankroller {
  id: string;
}

export default class Bankroller {
  private _started: boolean;
  private _loadedDirectories: Set<string>;
  gamesMap: Map<string, DApp>;
  constructor() {
    this.gamesMap = new Map();
    global["DCLib"] = new GlobalGameLogicStore();
  }

  async start() {
    if (this._started) {
      throw new Error("Bankroller allready started");
    }
    await Eth.initAccount();
    (await IpfsTransportProvider.create()).exposeSevice(
      Eth.account().address,
      this
    );
    this._started = true;
    getSubDirectoriee(_config.dapps_dir).forEach(this.tryLoadDApp);
  }
  async uploadGame(
    name: string,
    files: { fileName: string; fileData: Buffer }[]
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
  getGameInstances(name: string) {
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
          roomProvider
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
