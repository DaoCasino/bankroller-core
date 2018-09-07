import _config from "config";
import path from "path";
import * as messaging from "dc-messaging";
import PQueue from "p-queue";
import Eth from "../Eth";
import RSA from "../../src/rsa";
import logicPaychannel from "./PayChannel";
import * as Utils from "../utils";
import { disconnect } from "cluster";
import { channelState } from "./ChannelState";
import { DAppParams, IDapp, UserId } from "./Interfaces";

const Queue = new PQueue({ concurrency: 1 });

const web3 = Eth.web3;

// Max one-time clients for DApp
// const max_users = 9

messaging.upIPFS(
  _config.network.signal,
  path.join(
    path.resolve(),
    `/${process.env.DATA_PATH || "/data/"}/messaging/${process.env
      .DATA_SUBPATH || "/d1/"}/DataBase/`
  )
);

// Init ERC20 instance
const ERC20 = new web3.eth.Contract(
  _config.network.contracts.erc20.abi,
  _config.network.contracts.erc20.address
);

const ERC20approve = async function(spender, amount) {
  return new Promise(async (resolve, reject) => {
    let allowance = await ERC20.methods
      .allowance(Eth.account().address, spender)
      .call()
      .catch(err => {
        reject(err);
      });

    if (allowance < amount || (amount === 0 && allowance !== 0)) {
      const receipt = await ERC20.methods
        .approve(spender, amount)
        .send({
          from: Eth.account().address,
          gasPrice: _config.network.gasPrice,
          gas: _config.network.gasLimit
        })
        .on("error", err => {
          // Utils.debugLog(err, 'error')
          reject(new Error(false, err));
        })
        .catch(err => {
          reject(new Error(false, err));
        });

      if (
        typeof receipt === "undefined" ||
        !["0x01", "0x1", true].includes(receipt.status)
      ) {
        reject(new Error(receipt));
        return;
      }
    }
    resolve(true, null);
  });
};

type ConnectionId = string;

interface IClient {

}

interface ConnectionInfo {
  connectionId: ConnectionId,
  num: number,
  room: IClient
}

/*
 * DApp constructor
 */

export class DApp implements IDapp {
  _params: DAppParams;
  _connectionsMap: Map<UserId, ConnectionInfo>;
  constructor(params: DAppParams) {
    const slug = { params };
    if (!slug) {
      Utils.debugLog(["Create DApp error", params], "error");
      throw new Error("slug option is required");
    }
    const gameId =
      !process.env.DC_NETWORK || process.env.DC_NETWORK !== "local"
        ? slug
        : `${slug}_dev`;
    const hash = Utils.checksum(params.slug);
    this._params = {
      ...params,
      hash,
      users: {},
      timer: 10,
      checkTimeout: 0,
      sharedRoom: params.roomProvider.getSharedRoom(
        gameId,
        Eth.account().address,
        this.onNewUserConnect
      )
    };
    //TODO ???
    if (!global.DAppsLogic || !global.DAppsLogic[params.slug]) {
      throw new Error("Cant find DApp logic");
    }
    /*
    const {rules,       
    hash,       
    users,       
    sharedRoom,  
    timer,        
    checkTimeout } = this._params;*/

    // (async () => {
    //   if (params.contract &&
    //     (process.env.DC_NETWORK !== 'local')
    //   ) {
    //     this.contract_address = params.contract.address
    //     this.contract_abi     = params.contract.abi

    //     Utils.debugLog('Your contract is injected')
    //   } else {
    //     const contract = await Utils.LocalGameContract(_config.network.contracts.paychannelContract)

    //     this.contract_address = contract.address

    //     Utils.debugLog('Local contract is injected')
    //   }

    //   this.PayChannel = new web3.eth.Contract(this.contract_abi, this.contract_address)

    //   Utils.debugLog('Start approve ', this.slug)

    //   tryApprove()
    // })()

    this._initContract();

    // Listen users actions
  }

  private async _initContract() {
    let { contract } = this._params;
    if (!contract || process.env.DC_NETWORK === "local") {
      contract = await Utils.localGameContract(
        _config.network.contracts.paychannelContract
      );
      // ??? this.contract_abi     = JSON.parse(contract.abi)
    }
    this.PayChannel = new web3.eth.Contract(contract.abi, contract.address);
    this._tryApprove();
  }
  private _tryApprove() {
    this.approveGameContract(
      this.PayChannel.options.address,
      100000000,
      res => {
        if (res.error) {
          console.log("Repeat approve", this.slug);
          this._tryApprove();
          return;
        }

        // Sending beacon messages to room
        // that means we are online
        let log_beacon = 0;
        const beacon = (t = 3000) => {
          // max users connected
          // dont send beacon
          // if (Object.keys(this.users).length >= max_users) {
          //   setTimeout(() => { beacon(t) }, t)
          //   return false
          // }

          // Utils.debugLog('Eth.getBetBalance')
          Eth.getBetBalance(Eth.acc.address, bets => {
            if (log_beacon < 5)
              Utils.debugLog(
                "Beacon " +
                  this.slug +
                  ", " +
                  Eth.acc.address +
                  " bets " +
                  bets,
                _config.loglevel
              );
            log_beacon++;

            this._params.sharedRoom.bankrollerActive({
              deposit: Utils.bet2dec(bets), // bets * 100000000,
              dapp: {
                slug: this._params.slug,
                hash: this._params.hash
              }
            });
            setTimeout(() => {
              beacon(t);
            }, t);
          });
        };
        beacon(3000);
      }
    );
  }
  async approveGameContract(address, amount = 100000000, callback = false) {
    Queue.add(() =>
      new Promise(async resolve => {
        amount = "" + amount;
        try {
          await ERC20approve(this.PayChannel.options.address, 0);
          await ERC20approve(
            this.PayChannel.options.address,
            web3.utils.toWei(amount)
          );
          Utils.debugLog("ERC20approve complete");
          resolve();
          if (callback) callback({ error: null });
        } catch (e) {
          console.error("Approve error", e);
          resolve();
          if (callback) callback({ error: e });
        }
      })
        .then(() => {
          console.log(
            "Done: approveGameContract " + this.PayChannel.options.address
          );
        })
        .catch(e => {
          console.error("Error: approveGameContract ", e);
        })
    );
  }

  // User connect
  async onNewUserConnect(params) {
    const connectionId = Utils.makeSeed();
    const { userId } = params;
    const account = Eth.account();
    const connectionInfo = {
      connectionId,
      num: Object.keys(this.users).length,
      room: this._params.roomProvider.getRoom(
        account.address,
        `${this.hash}_${connectionId}`,
        { privateKey: account.privateKey, allowedUsers: [userId] },
        
      )
    };
    .pcha = new logicPaychannel();
    U.logic = new global.DAppsLogic[this.slug](U.pcha);
    U.logic.payChannel = U.pcha;

    this.users[user_id] = U;

    // Listen personal user room messages
    const listen_all = async data => {
      if (!data || !data.action || !data.user_id || !this.users[data.user_id])
        return;

      let User = this.users[data.user_id];

      if (data.action === "open_channel") {
        this._openChannel(data);
      }
      if (data.action === "check_open_channel") {
        this._checkOpenChannel(data);
      }
      if (data.action === "update_state") {
        this._updateState(data);
      }
      if (data.action === "close_by_consent") {
        this._closeByConsent(data);
      }
      if (data.action === "channel_closed") {
        this._checkCloseChannel(data);
      }

      if (data.action === "reconnect") {
        Utils.debugLog("User reconnect", _config.loglevel);
        // this._reconnect(data)
      }
      if (data.action === "close_timeout") {
        this.timer = 10;
      }

      // call user logic function
      if (data.action === "call") {
        this._call(data);
        return;
      }

      if (data.action === "disconnect") {
        Utils.debugLog(
          "User " + data.user_id + " disconnected",
          _config.loglevel
        );

        User.room.off("all", listen_all);
        delete this.users[data.user_id];
        this.response(data, { disconnected: true }, User.room);
      }
    };
    this.users[user_id].room.on("all", listen_all);

    setTimeout(async () => {
      if (connection_id) {
        this.response(params, { id: connection_id }, this.sharedRoom);
        Utils.debugLog(
          "User " + user_id + " connected to " + this.slug,
          _config.loglevel
        );
      }
    }, 999);
  }

  async openChannel(params) {
    if (typeof params.args !== "object" || !params.args.player_address) return;

    const user = this.users[params.args.player_address];
    if (!user) return;
    const response_room = user.room;

    // Create RSA keys for user
    user.RSA = new RSA();
    await user.RSA.generateRSAkey();

    // Args for open channel transaction
    const args = {
      channel_id: params.args.channel_id,
      player_address: params.args.player_address,
      bankroller_address: Eth.acc.address,
      player_deposit: params.args.player_deposit,
      bankroller_deposit: params.args.player_deposit * this.rules.depositX,
      opening_block: await web3.eth.getBlockNumber(),
      game_data: params.args.game_data,
      _N: "0x" + user.RSA.RSA.n.toString(16),
      _E: "0x0" + user.RSA.RSA.e.toString(16)
    };

    const to_sign = [
      { t: "bytes32", v: args.channel_id },
      { t: "address", v: args.player_address },
      { t: "address", v: args.bankroller_address },
      { t: "uint", v: "" + args.player_deposit },
      { t: "uint", v: "" + args.bankroller_deposit },
      { t: "uint", v: args.opening_block },
      { t: "uint", v: args.game_data },
      { t: "bytes", v: args._N },
      { t: "bytes", v: args._E }
    ];

    let signed_args;
    try {
      signed_args = Eth.signHash(Utils.sha3(...to_sign));
    } catch (e) {}

    this.response(
      params,
      { args: args, signed_args: signed_args },
      response_room
    );

    this.users[args.player_address].paychannel = {
      session: 0,
      channel_id: args.channel_id,
      player_deposit: args.player_deposit,
      bankroller_deposit: args.bankroller_deposit
    };
  }

  async checkOpenChannel(data) {
    const user = this.users[data.user_id];
    if (!user || !user.paychannel) return;

    const l_channel = user.paychannel;
    const response_room = user.room;

    const channel = await this.PayChannel.methods
      .channels(l_channel.channel_id)
      .call();

    if (
      channel.state === "1" &&
      channel.player.toLowerCase() === data.user_id.toLowerCase() &&
      channel.bankroller.toLowerCase() === Eth.acc.address.toLowerCase() &&
      "" + channel.playerBalance === "" + l_channel.player_deposit &&
      "" + channel.bankrollerBalance === "" + l_channel.bankroller_deposit
    ) {
      this.users[data.user_id].paychannel.info = channel;

      // Устанавливаем депозит игры
      this.users[data.user_id].logic.payChannel._setDeposits(
        channel.playerBalance,
        channel.bankrollerBalance
      );

      this.response(
        data,
        { status: "ok", info: channel, error: null },
        response_room
      );
    } else {
      this.response(data, { error: "channel not found" }, response_room);
    }
  }

  async call(data) {
    const user = this.users[data.user_id];
    if (!data.data || !data.data.gamedata || !data.data.seed) return;
    if (!data.func || !data.func.name || !data.func.args) return;

    if (!user.logic[data.func.name]) {
      console.error("Function " + data.func.name + " not exist in game logic");
      return;
    }
    // сверяем номер сессии
    user.paychannel.session++;
    if (data.data.session * 1 !== user.paychannel.session * 1) {
      // TODO: openDispute
      return 0;
    }

    // Инициализируем менеджер состояния канала для этого юзера если ещ нет
    if (!user.paychannel.State) {
      user.paychannel.State = new channelState(data.user_id);
    }
    // Проверяем нет ли неподписанных юзером предыдущих состояний
    if (user.paychannel.State.hasUnconfirmed()) {
      console.error(
        "Player " + data.user_id + " not confirm previous channel state"
      );
      return;
    }

    // Проверяем что юзера достаточно бетов для этой ставки
    let user_bets = user.paychannel.info.playerBalance;
    const last_state = user.paychannel.State.getBankrollerSigned();

    if (last_state && last_state._playerBalance) {
      user_bets = last_state._playerBalance;
    }

    console.log(Utils.dec2bet(user_bets), Utils.dec2bet(data.data.user_bet));
    if (Utils.dec2bet(user_bets) < Utils.dec2bet(data.data.user_bet) * 1) {
      console.error(
        "Player " + data.user_id + " not enougth money for this bet"
      );
      this.response(
        data,
        { error: "Player " + data.user_id + " not enougth money for this bet" },
        user.room
      );
      return;
    }

    // проверка подписи
    const to_verify_hash = [
      { t: "bytes32", v: user.paychannel.channel_id },
      { t: "uint", v: user.paychannel.session },
      { t: "uint", v: "" + data.data.user_bet },
      { t: "uint", v: data.data.gamedata },
      { t: "bytes32", v: data.data.seed }
    ];
    const recover_openkey = web3.eth.accounts.recover(
      Utils.sha3(...to_verify_hash),
      data.sign
    );
    if (recover_openkey.toLowerCase() !== data.user_id.toLowerCase()) {
      console.error("Invalid sig!");
      console.log(data);
      return;
    }

    // Подписываем рандом
    const confirmRandom = function(data) {
      let rnd_o = {};
      let rnd_i = false;
      for (let k in data.func.args) {
        let a = data.func.args[k];
        if (typeof a === "object" && typeof a.rnd === "object") {
          rnd_i = k;
          rnd_o = a.rnd;
          break;
        }
      }

      let args = data.func.args.slice(0);

      const rnd_hash_args = [
        { t: "bytes32", v: user.paychannel.channel_id },
        { t: "uint", v: user.paychannel.session },
        { t: "uint", v: "" + rnd_o.bet },
        { t: "uint", v: rnd_o.gamedata },
        { t: "bytes32", v: data.data.seed }
      ];

      console.log("rnd_hash_args", rnd_hash_args);
      let rnd_hash;
      try {
        rnd_hash = Utils.sha3(...rnd_hash_args);
      } catch (e) {
        console.error("Cant get sha3 from rnd_hash_args", e);
        console.log(rnd_hash_args);
        return false;
      }

      let rnd_sign;
      try {
        rnd_sign = user.RSA.signHash(rnd_hash).toString(16);
      } catch (e) {
        console.error("Cant RSA.signHash from rnd_hash", e);
        return false;
      }

      const rnd = Utils.sha3(rnd_sign);

      args[rnd_i] = rnd;

      if (!user.paychannel._totalBet) {
        user.paychannel._totalBet = 0;
      }
      user.paychannel._totalBet += rnd_o.bet;

      return {
        args: args,
        rnd_hash: rnd_hash,
        rnd_sign: rnd_sign
        // rnd      : rnd // TODO: check
      };
    };

    const confirmed = confirmRandom(data);
    if (!confirmed) return;

    // Вызываем функцию игры
    let returns = false;
    try {
      returns = user.logic.Game(...confirmed.args);
    } catch (e) {
      console.error("Cant call gamelogic function " + data.func.name);
      console.error("with args " + confirmed.args);
      console.error(e);
      return;
    }

    const state_data = {
      _id: user.paychannel.channel_id,
      _playerBalance: "" + user.logic.payChannel._getBalance().player,
      _bankrollerBalance: "" + user.logic.payChannel._getBalance().bankroller,
      _totalBet: "" + user.paychannel._totalBet,
      _session: user.paychannel.session
    };

    if (state_data["_playerBalance"][0] === "-")
      state_data["_playerBalance"] *= -1;
    if (state_data["_bankrollerBalance"][0] === "-")
      state_data["_bankrollerBalance"] *= -1;

    // Сохраняем подписанный нами последний стейт канала
    if (!user.paychannel.State.addBankrollerSigned(state_data)) {
      console.error(
        "Prodblem with save last channel state - addBankrollerSignedState",
        state_data
      );
      return false;
    }

    this.response(
      data,
      {
        args: confirmed.args,
        rnd_hash: confirmed.rnd_hash,
        rnd_sign: confirmed.rnd_sign,
        state: user.paychannel.State.getBankrollerSigned(),
        returns: returns
      },
      user.room
    );
  }

  updateState(data) {
    const user = this.users[data.user_id];

    if (!user.paychannel.State.addPlayerSigned(data.state)) {
      this.response(
        data,
        { status: "error", error: "incorrect data" },
        user.room
      );
      return;
    }

    this.response(data, { status: "ok" }, user.room);
  }

  async closeByConsent(data) {
    const user = this.users[data.user_id];

    const last_state = user.paychannel.State.getBankrollerSigned();

    // сохраняем "согласие" юзера на закрытие канала
    user.paychannel.closeByConsent = { data: data.data, sign: data.sign };

    // Отправляем ему свою подпись закрытия
    let close_data_hash = Utils.sha3(
      { t: "bytes32", v: last_state._id },
      { t: "uint", v: last_state._playerBalance },
      { t: "uint", v: last_state._bankrollerBalance },
      { t: "uint", v: last_state._totalBet },
      { t: "uint", v: last_state._session },
      { t: "bool", v: true }
    );
    const sign = Eth.signHash(close_data_hash);

    this.response(data, { sign: sign }, user.room);
  }

  async checkCloseChannel(data) {
    const user = this.users[data.user_id];
    if (!user || !user.paychannel) return;

    const l_channel = user.paychannel;

    const channel = await this.PayChannel.methods
      .channels(l_channel.channel_id)
      .call();
    if (channel.state === "2") {
      this.response(data, { status: "ok" }, user.room);
      delete this.users[data.user_id];
    } else {
      //
      // user.paychannel.closeByConsent
      // ???
    }
  }

  // Send message and wait response
  request(params, callback = false, Room = false) {
    Room = Room || this.users[this.users.state_data.player_address].room;

    if (!Room) {
      Utils.debugLog("request room not set!", "error");
      return;
    }

    return new Promise((resolve, reject) => {
      const uiid = Utils.makeSeed();

      params.type = "request";
      params.uiid = uiid;

      // Send request
      Utils.debugLog(params, _config.loglevel);
      Room.send(params, delivered => {
        if (!delivered) {
          reject(new Error("🙉 Cant send msg to bankroller, connection error"));
        }
      });

      // Wait response
      Room.once("uiid::" + uiid, result => {
        if (callback) callback(result);
        resolve(result.response);
      });
    });
  }

  // Response to request-message
  response(request_data, response, Room = false) {
    if (!Room) {
      Utils.debugLog("request roo not set!", "error");
      return;
    }

    request_data.response = response;
    request_data.type = "response";

    Room.send(request_data);
  }
}
