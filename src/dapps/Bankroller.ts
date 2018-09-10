import _config from "../../config";
import fs from "fs";
import path from "path";
import { DApp } from "./DApp";
import Eth from "../Eth";
import * as Utils from "../utils";
import { isNull } from "util";
import PayChannelLogic from "./PayChannelLogic";
import { IpfsRoomProvider } from "../Ipfs/IpfsRoomProvider";

/*
 * Lib constructor
 */
const MANIFEST_FILENAME = "dapp.manifest";

const checkFileExists = (
  fileName: string,
  maybeExtension: string[]
): string | null => {
  for (let i = 0; i < maybeExtension.length; i++) {
    const path = `${fileName}${maybeExtension}`;
    if (fs.existsSync(path)) {
      return path;
    }
  }
  return null;
};

export default class Bankroller {
  gamesMap: Map<string, DApp>;
  constructor() {
    this.gamesMap = new Map();
    global["DCLib"] = new GlobalGameLogicStore();
  }

  async start() {
    await Eth.initAccount();
    this.loadDir(_config.dapps_dir);
  }

  loadDir(directoryPath: string) {
    fs.readdirSync(directoryPath).forEach(key =>
      this.loadDApp(path.join(directoryPath, key))
    );
  }

  loadLogic(
    directoryPath: string
  ): { manifest: any; logic: (payChannel: PayChannelLogic) => void } {
    let manifestPath: string = `directoryPath/${MANIFEST_FILENAME}`;
    const manifestFoundPath = checkFileExists(manifestPath, [
      ".js",
      "",
      ".json"
    ]);
    if (!manifestFoundPath) {
      throw new Error(`Manifest file not found ${manifestPath}`);
    }
    const manifest = manifestFoundPath.endsWith(".js")
      ? require(manifestFoundPath).default
      : JSON.parse(fs.readFileSync(manifestFoundPath).toString());

    if (
      typeof manifest !== "object" ||
      manifest.disable ||
      manifest.disabled ||
      manifest.enable === false
    ) {
      return { manifest, logic: null };
    }
    let logicPath: string = manifest.logic;
    const logicFoundPath = checkFileExists(logicPath, [".js", "", ".json"]);
    if (!logicFoundPath) {
      throw new Error(`Manifest file not found ${logicFoundPath}`);
    }
    require(logicFoundPath);
    const logic = global["DCLib"][manifest.slug];
    if (!logic) {
      throw new Error(`Error loading logic from directory ${directoryPath}`);
    }
    return { manifest: { ...manifest }, logic };
  }

  loadDApp(directoryPath) {
    const { logic, manifest } = this.loadLogic(directoryPath);

    if (logic) {
      const { slug, rules, contract } = manifest;
      const dapp = new DApp({
        slug,
        rules,
        contract,
        roomProvider: new IpfsRoomProvider()
      });
      this.gamesMap.set(slug, dapp);
    }
    Utils.debugLog("", _config.loglevel);
    Utils.debugLog("", _config.loglevel);
    Utils.debugLog(["Load Dapp ", directoryPath], _config.loglevel);
    Utils.debugLog(manifest, _config.loglevel);
    Utils.debugLog("", _config.loglevel);
  }
}
