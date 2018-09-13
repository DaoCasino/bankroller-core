import { IMessagingProvider } from "dc-messaging";
import {
  IDappInstance,
  UserId,
  DAppInstanceParams,
  OpenChannelParams,
  SignedResponse,
  OpenChannelResponse,
  CallParams
} from "./Interfaces";
import RSA from "../Rsa";
import _config from "../../config";

import { sha3, debugLog, dec2bet } from "dc-ethereum-utils";
import PayChannelLogic from "./PayChannelLogic";
import { ChannelState } from "./ChannelState";

type SolidityType = "bytes32" | "address" | "uint" | "bytes" | "bool";
interface SolidityTypeValue {
  t: SolidityType;
  v: any;
}

export class DAppInstance implements IDappInstance {
  _params: DAppInstanceParams;
  RSA: RSA;
  channelId: string;
  playerAddress: string;
  playerDeposit: number;
  bankrollerDeposit: number;
  channel: any;
  payChannelLogic: PayChannelLogic;
  nonce: number;
  channelState: ChannelState;
  closeByConsentData: any;

  constructor(params: DAppInstanceParams) {
    this._params = params;
    this.nonce = 0;
    this.RSA = new RSA();
    this._params.roomProvider.exposeSevice(
      `${params.gameInfo.hash}_${this._params.userId}`,
      this
    );
    this.payChannelLogic = new PayChannelLogic();
    //TODO rempve fropm global
  }
  getView() {
    return {
      ...this.payChannelLogic.getView(),
      playerAddress: this.playerAddress
    };
  }
  async openChannel(
    params: OpenChannelParams
  ): Promise<SignedResponse<OpenChannelResponse>> {
    // Create RSA keys for user
    await this.RSA.generateRSAkey();

    const { channelId, playerAddress, playerDeposit, gameData } = params;
    this.channelId = channelId;
    this.playerAddress = playerAddress;
    this.playerDeposit = playerDeposit;
    const bankrollerAddress = this._params.Eth.account().address;
    const bankrollerDeposit = playerDeposit * this._params.rules.depositX;
    this.bankrollerDeposit = bankrollerDeposit;
    const openingBlock = await this._params.Eth.getBlockNumber();
    // Args for open channel transaction
    const _N = `0x${this.RSA.RSAKey.n.toString(16)}`;
    const _E = `0x0${this.RSA.RSAKey.e.toString(16)}`;
    const response = {
      channelId,
      playerAddress,
      playerDeposit,
      bankrollerAddress,
      bankrollerDeposit,
      openingBlock,
      gameData,
      _N,
      _E
    };
    // Args for open channel transaction
    const toSign: SolidityTypeValue[] = [
      { t: "bytes32", v: channelId },
      { t: "address", v: playerAddress },
      { t: "address", v: bankrollerAddress },
      { t: "uint", v: playerDeposit.toString() },
      { t: "uint", v: bankrollerDeposit.toString() },
      { t: "uint", v: openingBlock },
      { t: "uint", v: gameData },
      { t: "bytes", v: _N },
      { t: "bytes", v: _E }
    ];

    const signature = this._params.Eth.signHash(sha3(...toSign));

    return { response, signature };

    // this.users[args.player_address].paychannel = {
    //   session: 0,
    //   channel_id: args.channel_id,
    //   player_deposit: args.player_deposit,
    //   bankroller_deposit: args.bankroller_deposit
    // };
  }
  async checkOpenChannel(data: { userId: UserId }): Promise<any> {
    const channel = await this._params.payChannelContract.methods
      .channels(this.channelId)
      .call();

    if (
      channel.state === "1" &&
      channel.player.toLowerCase() === data.userId.toLowerCase() &&
      channel.bankroller.toLowerCase() ===
        this._params.Eth.account().address.toLowerCase() &&
      "" + channel.playerBalance === "" + this.playerDeposit &&
      "" + channel.bankrollerBalance === "" + this.bankrollerDeposit
    ) {
      this.channel = channel;

      // Устанавливаем депозит игры
      this.payChannelLogic._setDeposits(
        channel.playerBalance,
        channel.bankrollerBalance
      );
      return channel;
    } else {
      throw new Error("channel not found");
    }
  }

  async call(
    data: CallParams
  ): Promise<{
    args: any[];
    hash: string;
    signature: string;
    state: any;
    returns: any;
  }> {
    if (
      !data ||
      !data.gamedata ||
      !data.seed ||
      !data.method ||
      !data.args ||
      !data.nonce
    ) {
      throw new Error("Invalid arguments");
    }

    if (data.method.substring(0, 1) === "_") {
      throw new Error("Cannot call private function");
    }

    const func = this._params.logic[data.method];
    if (typeof func !== "function") {
      throw new Error(`No function ${event} in game logic`);
    }

    // сверяем номер сессии
    this.nonce++;
    if (data.nonce * 1 !== this.nonce * 1) {
      throw new Error("Invalid nonce");
      // TODO: openDispute
    }

    // Инициализируем менеджер состояния канала для этого юзера если ещ нет
    if (!this.channelState) {
      this.channelState = new ChannelState(
        this._params.userId,
        this._params.Eth
      );
    }
    // Проверяем нет ли неподписанных юзером предыдущих состояний
    if (this.channelState.hasUnconfirmed()) {
      throw new Error(
        "Player " + this._params.userId + " not confirm previous channel state"
      );
    }

    // Проверяем что юзера достаточно бетов для этой ставки
    let userBets = this.channel.playerBalance;
    const lastState = this.channelState.getBankrollerSigned();

    if (lastState && lastState._playerBalance) {
      userBets = lastState._playerBalance;
    }

    console.log(dec2bet(userBets), dec2bet(data.userBet));
    if (dec2bet(userBets) < dec2bet(data.userBet) * 1) {
      throw new Error(
        "Player " + this._params.userId + " not enougth money for this bet"
      );
    }

    // проверка подписи
    const toSign: SolidityTypeValue[] = [
      { t: "bytes32", v: this.channelId },
      { t: "uint", v: this.nonce },
      { t: "uint", v: "" + data.userBet },
      { t: "uint", v: data.gamedata },
      { t: "bytes32", v: data.seed }
    ];
    const recoverOpenkey = this._params.Eth.recover(sha3(...toSign), data.sign);
    if (recoverOpenkey.toLowerCase() !== this._params.userId.toLowerCase()) {
      throw new Error("Invalid signature");
    }

    // Подписываем рандом

    const confirmed = this._confirmRandom(data);

    // Вызываем функцию игры
    let returns;
    try {
      returns = this._params.logic.Game(...confirmed.args);
    } catch (error) {
      const errorData = {
        message: `Cant call gamelogic function ${data.method} with args ${
          confirmed.args
        }`,
        error
      };
      throw new Error(JSON.stringify(errorData));
    }

    const state_data = {
      _id: this.channelId,
      _playerBalance: "" + this.payChannelLogic._getBalance().player,
      _bankrollerBalance: "" + this.payChannelLogic._getBalance().bankroller,
      _totalBet: "" + lastState._totalBet,
      _nonce: this.nonce
    };

    // TODO ask Kellas WTF
    // if (state_data["_playerBalance"][0] === "-")
    //   state_data["_playerBalance"] *= -1;
    // if (state_data["_bankrollerBalance"][0] === "-")
    //   state_data["_bankrollerBalance"] *= -1;

    // Сохраняем подписанный нами последний стейт канала
    if (!this.channelState.addBankrollerSigned(state_data)) {
      throw new Error(
        "Prodblem with save last channel state - addBankrollerSignedState"
      );
    }
    return {
      ...confirmed,
      state: this.channelState.getBankrollerSigned(),
      returns
    };
  }

  _confirmRandom(
    data: CallParams
  ): {
    args: any[];
    hash: string;
    signature: string;
  } {
    let rnd_o: any = {};
    let rnd_i = "";
    for (let k in data.args) {
      let a = data.args[k];
      if (typeof a === "object" && typeof a.rnd === "object") {
        rnd_i = k;
        rnd_o = a.rnd;
        break;
      }
    }

    let args = data.args.slice(0);

    const toSign = [
      { t: "bytes32", v: this.channelId },
      { t: "uint", v: this.nonce },
      { t: "uint", v: "" + rnd_o.bet },
      { t: "uint", v: data.gamedata },
      { t: "bytes32", v: data.seed }
    ];

    const hash = sha3(...toSign);
    const signature = this.RSA.signHash(hash).toString(16);

    const signatureHash = sha3(signature);

    args[rnd_i] = signatureHash;
    // TODO refactor math
    // if (!user.paychannel._totalBet) {
    //   user.paychannel._totalBet = 0;
    // }
    // user.paychannel._totalBet += rnd_o.bet;

    return {
      args,
      hash,
      signature
      // rnd      : rnd // TODO: check
    };
  }
  updateState(data: { userId: UserId; state: any }): { status: string } {
    if (!this.channelState.addPlayerSigned(data.state)) {
      throw new Error("incorrect data");
    }
    return { status: "ok" };
  }

  closeByConsent(data): { sign: string } {
    const lastState = this.channelState.getBankrollerSigned();

    // сохраняем "согласие" юзера на закрытие канала
    this.closeByConsentData = data;

    // Отправляем ему свою подпись закрытия
    let hash = sha3(
      { t: "bytes32", v: lastState._id },
      { t: "uint", v: lastState._playerBalance },
      { t: "uint", v: lastState._bankrollerBalance },
      { t: "uint", v: lastState._totalBet },
      { t: "uint", v: lastState._session },
      { t: "bool", v: true }
    );
    const sign = this._params.Eth.signHash(hash);

    return { sign };
  }

  async checkCloseChannel(data) {
    const channel = await this._params.payChannelContract.methods
      .channels(this.channelId)
      .call();
    if (channel.state === "2") {
      this.finish();
      return { status: "ok" };
    } else {
      //
      // user.paychannel.closeByConsent
      // ???
    }
  }
  finish() {
    this._params.onFinish(this._params.userId);
  }

  reconnect(data) {
    debugLog("User reconnect", _config.loglevel);
    //TODE implement or delete
  }
  disconnect() {
    this.finish();
    return { disconnected: true };
  }
}
