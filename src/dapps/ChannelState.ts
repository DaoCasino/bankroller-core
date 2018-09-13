import { Eth } from "dc-ethereum-utils";
import * as Utils from "dc-ethereum-utils";
/*
 * Channel state manager / store
 */

export class ChannelState {
  states: any;
  wait_states: any;
  state_format: any;
  player_openkey: any;
  private eth: Eth;
  constructor(player_openkey: string, eth: Eth) {
    this.eth = eth;
    if (!player_openkey) {
      console.error(" player_openkey required in channelState constructor");
      return;
    }
    this.player_openkey = player_openkey;
    let states = {
      // hash: {
      //   bankroller : {},
      //   player     : {},
      //   confirmed  : false
      // }
    };

    let wait_states = {};

    const state_format = {
      _id: "",
      _playerBalance: "",
      _bankrollerBalance: "",
      _totalBet: "",
      _session: "",
      _sign: ""
    };
  }
  checkFormat(data) {
    for (let k in this.state_format) {
      if (k !== "_sign" && !data[k]) return false;
    }
    return true;
  }

  GetState(hash = undefined) {
    if (Object.keys(this.states).length === 0) return {};
    if (!hash) hash = Object.keys(this.states).splice(-1);
    return this.states[hash];
  }

  addBankrollerSigned(state_data) {
    if (!this.checkFormat(state_data)) {
      console.error("Invalid channel state format in addBankrollerSigned");
      return false;
    }

    const state_hash = Utils.sha3(
      { t: "bytes32", v: state_data._id },
      { t: "uint", v: state_data._playerBalance },
      { t: "uint", v: state_data._bankrollerBalance },
      { t: "uint", v: state_data._totalBet },
      { t: "uint", v: state_data._session }
    );
    const state_sign = this.eth.signHash(state_hash);

    if (!this.states[state_hash])
      this.states[state_hash] = { confirmed: false };
    this.states[state_hash].bankroller = Object.assign(state_data, {
      _sign: state_sign
    });
    this.wait_states[state_hash] = state_data._session;
    return true;
  }

  addPlayerSigned(state_data) {
    if (!this.checkFormat(state_data)) {
      console.error("Invalid channel state format in addPlayerSigned");
      return false;
    }

    const player_state_hash = Utils.sha3(
      { t: "bytes32", v: state_data._id },
      { t: "uint", v: state_data._playerBalance },
      { t: "uint", v: state_data._bankrollerBalance },
      { t: "uint", v: state_data._totalBet },
      { t: "uint", v: state_data._session }
    );

    const state = this.GetState(player_state_hash);
    if (!state || !state.bankroller) {
      console.error("State with hash " + player_state_hash + " not found");
      return false;
    }

    // Проверяем содержимое
    for (let k in state.bankroller) {
      if (k === "_sign") continue;
      if (state.bankroller[k] !== state_data[k]) {
        console.error(
          "user channel state != last bankroller state",
          state,
          state_data
        );
        console.error(state.bankroller[k] + "!==" + state_data[k]);
        return false;
      }
    }

    // Проверяем подпись
    const state_hash = Utils.sha3(
      { t: "bytes32", v: state.bankroller._id },
      { t: "uint", v: state.bankroller._playerBalance },
      { t: "uint", v: state.bankroller._bankrollerBalance },
      { t: "uint", v: state.bankroller._totalBet },
      { t: "uint", v: state.bankroller._session }
    );

    if (state_hash !== player_state_hash) {
      console.error(" state_hash!=player_state_hash ...");
      return false;
    }

    const recover_openkey = this.eth.recover(state_hash, state_data._sign);
    if (recover_openkey.toLowerCase() !== this.player_openkey.toLowerCase()) {
      console.error("State " + recover_openkey + "!=" + this.player_openkey);
      return false;
    }

    this.states[state_hash].player = Object.assign({}, state_data);
    this.states[state_hash].confirmed = true;

    delete this.wait_states[state_hash];

    return true;
  }

  hasUnconfirmed() {
    return Object.keys(this.wait_states).length > 0;
  }

  get(hash) {
    return this.GetState(hash);
  }

  getPlayerSigned(hash = undefined) {
    if (!hash) hash = Object.keys(this.states).splice(-1);
    return this.GetState(hash).player;
  }

  getBankrollerSigned(hash = undefined) {
    if (!hash) hash = Object.keys(this.states).splice(-1);
    return this.GetState(hash).bankroller;
  }
}
