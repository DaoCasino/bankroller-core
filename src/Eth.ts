import _config from "../config.js";
import Web3 from "web3";
import DB from "./DB";
import fetch from "node-fetch";
import { sign as signHash } from "eth-lib/lib/account.js";
import * as Utils from "./utils";

interface Balance {
  balance?: number;
  updated?: number;
}
interface LastBalances {
  bet: Balance;
  eth: Balance;
}
interface Cache {
  lastBalances: LastBalances;
}

export default new class Eth {
  private _web3;
  private _getAccountPromise: Promise<string>;
  private _cache: Cache;
  private _ERC20Contract: any;
  private _account: any;
  private _store: any;
  constructor() {
    this._web3 = new Web3(
      new Web3.providers.HttpProvider(_config.network.rpc_url)
    );
    this._cache = { lastBalances: { bet: {}, eth: {} } };
    this._store = {};
    // Init ERC20 contract
    this._ERC20Contract = new this._web3.eth.Contract(
      _config.network.contracts.erc20.abi,
      _config.network.contracts.erc20.address
    );
    // setTimeout(async ()=>{
    //   this._cache.lastBalances = await this.getBalances()
    //   console.log('Acc balance '+ this.acc.address, this._cache.lastBalances );
    // }, 5000)
  }
  account() {
    return this._account;
  }
  async initAccount() {
    let privateKey = await DB.get("privateKey");

    if (!privateKey) {
      // TODO put to config
      // if (process.env.DC_NETWORK === 'sdk') {
      //     privateKey = '0x8d5366123cb560bb606379f90a0bfd4769eecc0557f1b362dcae9012b548b1e5'
      // } else
      try {
        privateKey = await this.getAccountFromServer();
      } catch (error) {
        // TODO log smth
      }
      privateKey = privateKey || this._web3.eth.accounts.create().privateKey;
      await DB.set("privateKey", privateKey);
    }
    this._account = this._web3.eth.accounts.privateKeyToAccount(privateKey);
    this._web3.eth.accounts.wallet.add(privateKey);
    return true;
  }

  // TODO WTF???
  signHash(rawHash) {
    const hash = Utils.add0x(rawHash);
    if (!this._web3.utils.isHexStrict(hash)) {
      Utils.debugLog(hash + " is not correct hex", _config.loglevel);
      Utils.debugLog(
        "Use DCLib.Utils.makeSeed or Utils.soliditySHA3(your_args) to create valid hash",
        _config.loglevel
      );
    }
    return signHash(hash, Utils.add0x(this._account.privateKey));
  }

  recover(state_hash, sign): string {
    return this._web3.eth.accounts.recover(state_hash, sign);
  }

  async getAccountFromServer(): Promise<string> {
    if (this._getAccountPromise) {
      await this._getAccountPromise;
    }
    if (this._store.account_from_server) return this._store.account_from_server;

    this._getAccountPromise = fetch(_config.faucet.get_acc_url, {}).then(res =>
      res.json()
    );

    const requestResult = await this._getAccountPromise;
    this._store.account_from_server = JSON.parse(requestResult);
    Utils.debugLog(
      ["Server account data: ", this._store.account_from_server],
      _config.loglevel
    );
    return this._store.account_from_server.privateKey;
  }

  // getAccountFromServer(): Promise<string> {
  //   if (this._store.account_from_server) {
  //     if (this._store.account_from_server === "wait") {
  //       return new Promise((resolve, reject) => {
  //         let waitTimer = () => {
  //           setTimeout(() => {
  //             if (this._store.account_from_server.privateKey) {
  //               resolve(this._store.account_from_server);
  //             } else {
  //               waitTimer();
  //             }
  //           }, 1000);
  //         };
  //         waitTimer();
  //       });
  //     }
  //     return;
  //   }

  //   this._store.account_from_server = "wait";

  //   return fetch(_config.faucet.get_acc_url)
  //     .then(res => {
  //       return res.json();
  //     })
  //     .then(acc => {
  //       Utils.debugLog(["Server account data: ", acc], _config.loglevel);
  //       this._store.account_from_server = acc;
  //       return acc.privateKey;
  //     })
  //     .catch(e => {
  //       return false;
  //     });
  // }

  async getBalances(): Promise<LastBalances> {
    const { address } = this._account;
    this._cache.lastBalances.bet = await this.getBetBalance(address);
    this._cache.lastBalances.eth = await this.getEthBalance(address);
    return this._cache.lastBalances;
  }

  async getEthBalance(address): Promise<Balance> {
    if (!address) throw new Error("Empty address in ETH balance request");
    const weiBalance = this._web3.eth.getBalance(address);
    return {
      balance: this._web3.utils.fromWei(weiBalance),
      updated: Date.now()
    };
  }

  async getBetBalance(address): Promise<Balance> {
    if (!address) throw new Error("Empty address in BET balance request");
    const decBalance = this._ERC20Contract.methods.balanceOf(address).call();
    const balance = Utils.dec2bet(decBalance);
    return { balance, updated: Date.now() };
  }
}();
