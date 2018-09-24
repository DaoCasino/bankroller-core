import { ISharedRoom } from "dc-messaging";

import { Eth } from "dc-ethereum-utils";
import * as Utils from "dc-ethereum-utils";

import {
  DAppInstance,
  IDApp,
  DAppParams,
  UserId,
  GameInfo,
  IDAppInstance
} from "dc-core";
import { setInterval } from "timers";
import { Logger } from "dc-logging";
import { config } from "dc-configs";

const logger = new Logger("DAppInstance");

/*
 * DApp constructor
 */

export class DApp implements IDApp {
  private _params: DAppParams;
  _instancesMap: Map<UserId, DAppInstance>;
  _payChannelContract: any;
  _sharedRoom: ISharedRoom;
  _gameInfo: GameInfo;
  _beaconInterval: NodeJS.Timer;
  constructor(params: DAppParams) {
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
  }
  getView() {
    return { name: this._params.slug };
  }
  getInstancesView() {
    return Array.from(this._instancesMap.values()).map(instance =>
      instance.getView()
    );
  }
  async start() {
    this._sharedRoom = await this._params.roomProvider.getSharedRoom(
      `dapp_room${this._gameInfo.hash}`,
      this.onNewUserConnect
    );
    let { contract } = this._params;
    if (!contract) {
      contract = await Utils.localGameContract(
        config.contracts.payChannelContract
      );
      // ??? this.contract_abi     = JSON.parse(contract.abi)
    }
    this._payChannelContract = this._params.Eth.getContract(
      contract.abi,
      contract.address
    );

    await this._params.Eth.ERC20ApproveSafe(contract.address, 100000000);

    this._startSendingBeacon(3000);
  }

  async _startSendingBeacon(timeOut) {
    let log_beacon = 0;
    // Utils.debugLog('this._params.Eth.getBetBalance')
    const { balance } = await this._params.Eth.getBetBalance(
      this._params.Eth.account().address
    );
    const self = this;

    this._beaconInterval = setInterval(() => {
      self._sharedRoom.bankrollerActive({
        deposit: Utils.bet2dec(balance), // bets * 100000000,
        dapp: {
          slug: self._params.slug,
          hash: self._gameInfo.hash
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
    const account = this._params.Eth.account();
    const dappInstance = new DAppInstance({
      userId,
      num: 0,
      rules: config.rules,
      payChannelContract: this._payChannelContract,
      logic: params.logic,
      roomProvider: params.roomProvider,
      onFinish: this.onGameFinished,
      gameInfo: this._gameInfo,
      Eth: this._params.Eth
    });

    //TODO remove circular dependency

    this._instancesMap.set(userId, dappInstance);
    logger.debug(`User ${userId} connected to  ${this._params.slug}`);

    return { connectionId };
  }
}
