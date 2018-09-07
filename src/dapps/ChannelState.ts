import Eth from "../Eth";
import * as Utils from "../utils";

/*
 * Channel state manager / store
 */
export const channelState = function(player_openkey: string) {
  if (!player_openkey) {
    console.error(" player_openkey required in channelState constructor");
    return;
  }

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

  const checkFormat = data => {
    for (let k in state_format) {
      if (k !== "_sign" && !data[k]) return false;
    }
    return true;
  };

  const GetState = (hash = undefined) => {
    if (Object.keys(states).length === 0) return {};
    if (!hash) hash = Object.keys(states).splice(-1);
    return states[hash];
  };

  return {
    addBankrollerSigned(state_data) {
      if (!checkFormat(state_data)) {
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
      const state_sign = Eth.signHash(state_hash);

      if (!states[state_hash]) states[state_hash] = { confirmed: false };
      states[state_hash].bankroller = Object.assign(state_data, {
        _sign: state_sign
      });
      wait_states[state_hash] = state_data._session;
      return true;
    },

    addPlayerSigned(state_data) {
      if (!checkFormat(state_data)) {
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

      const state = GetState(player_state_hash);
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

      const recover_openkey = Eth.recover(state_hash, state_data._sign);
      if (recover_openkey.toLowerCase() !== player_openkey.toLowerCase()) {
        console.error("State " + recover_openkey + "!=" + player_openkey);
        return false;
      }

      states[state_hash].player = Object.assign({}, state_data);
      states[state_hash].confirmed = true;

      delete wait_states[state_hash];

      return true;
    },

    hasUnconfirmed() {
      return Object.keys(wait_states).length > 0;
    },

    get: GetState,

    getPlayerSigned(hash = undefined) {
      if (!hash) hash = Object.keys(states).splice(-1);
      return GetState(hash).player;
    },

    getBankrollerSigned(hash = undefined) {
      if (!hash) hash = Object.keys(states).splice(-1);
      return GetState(hash).bankroller;
    }
  };
};
