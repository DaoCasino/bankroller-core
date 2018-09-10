import _config from "../../config";
import path from "path";
import web3 from "web3";
import PQueue from "p-queue";
import Eth from "../Eth";
import RSA from "../../src/rsa";
import * as Utils from "../utils";
import { disconnect } from "cluster";
import { DAppParams, IDApp, UserId, GameInfo, ISharedRoom } from "./Interfaces";
import PayChannelLogic from "./PayChannelLogic";
import { ServiceWrapper } from "../ServiceWrapper";
import { DAppInstance } from "./DAppInstance";
import { setInterval } from "timers";

/*
 * DApp constructor
 */

export class DApp implements IDApp {
  _params: DAppParams;
  _instancesMap: Map<UserId, DAppInstance>;
  _payChannelContract: any;
  _sharedRoom: ISharedRoom;
  _gameInfo: GameInfo;
  _beaconInterval: NodeJS.Timer;
  constructor(params: DAppParams, init: boolean = true) {
    const { slug } = params;
    if (!slug) {
      Utils.debugLog(["Create DApp error", params], "error");
      throw new Error("slug option is required");
    }
    const gameId =
      !process.env.DC_NETWORK || process.env.DC_NETWORK !== "local"
        ? slug
        : `${slug}_dev`;

    this._gameInfo = {
      gameId,
      slug,
      hash: Utils.checksum(slug),
      contract: params.contract
    };

    this._params = params;

    //TODO ???
    if (init) this.init();
  }

  async init() {
    this._sharedRoom = await this._params.roomProvider.getSharedRoom(
      this._gameInfo.gameId,
      this.onNewUserConnect
    );
    let { contract } = this._params;
    if (!contract || process.env.DC_NETWORK === "local") {
      contract = await Utils.localGameContract(
        _config.network.contracts.paychannelContract
      );
      // ??? this.contract_abi     = JSON.parse(contract.abi)
    }
    this._payChannelContract = Eth.getContract(contract.abi, contract.address);

    await Eth.ERC20ApproveSafe(contract.address, 100000000);

    this._startSendingBeacon(3000);
  }

  async _startSendingBeacon(timeOut) {
    let log_beacon = 0;
    // Utils.debugLog('Eth.getBetBalance')
    const { balance } = await Eth.getBetBalance(Eth.account().address);
    const self = this;

    this._beaconInterval = setInterval(() => {
      this._sharedRoom.bankrollerActive({
        deposit: Utils.bet2dec(balance), // bets * 100000000,
        dapp: {
          slug: this._params.slug,
          hash: this._gameInfo.hash
        }
      });
    }, timeOut);
  }

  // User connect
  onGameFinished(userId: UserId) {
    this._instancesMap.delete(userId);
  }
  async onNewUserConnect(params) {
    const connectionId = Utils.makeSeed();
    const { userId } = params;
    const account = Eth.account();
    const dappInstance = new DAppInstance({
      userId,
      num: 0,
      rules: _config.rules,
      payChannelContract: this._payChannelContract,
      logic: params.logic,
      roomProvider: params.roomProvider,
      onFinish: this.onGameFinished,
      gameInfo: this._gameInfo
    });

    //TODO remove circular dependency

    this._instancesMap.set(userId, dappInstance);
    Utils.debugLog(
      "User " + userId + " connected to " + this._params.slug,
      _config.loglevel
    );
    return { connectionId };
  }
}
