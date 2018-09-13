import BN from "bn.js";
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
  private static _web3 = new Web3(
    new Web3.providers.HttpProvider(_config.network.rpc_url)
  );
  private _getAccountPromise: Promise<string>;
  private _cache: Cache;
  private _ERC20Contract: any;
  private _payChannelContract: any;
  private _account: any;
  private _store: any;
  constructor() {
    this._cache = { lastBalances: { bet: {}, eth: {} } };
    this._store = {};
    // Init ERC20 contract
    this._ERC20Contract = new Eth._web3.eth.Contract(
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
  getContract(abi: any, address: string) {
    return new Eth._web3.eth.Contract(abi, address);
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
        throw new Error("Faucet server is not responding");
      }

      await DB.set("privateKey", privateKey);
    }
    this._account = Eth._web3.eth.accounts.privateKeyToAccount(privateKey);
    Eth._web3.eth.accounts.wallet.add(privateKey);
    return true;
  }

  // TODO WTF???
  signHash(rawHash) {
    const hash = Utils.add0x(rawHash);
    if (!Eth._web3.utils.isHex(hash)) {
      Utils.debugLog(hash + " is not correct hex", _config.loglevel);
      Utils.debugLog(
        "Use DCLib.Utils.makeSeed or Utils.soliditySHA3(your_args) to create valid hash",
        _config.loglevel
      );
    }
    return signHash(hash, Utils.add0x(this._account.privateKey));
  }

  recover(state_hash, sign): string {
    return Eth._web3.eth.accounts.recover(state_hash, sign);
  }
  getBlockNumber(): Promise<any> {
    return Eth._web3.eth.getBlockNumber();
  }
  randomHash() {
    return this._account.sign(Utils.makeSeed()).messageHash;
  }

  numFromHash(randomHash, min = 0, max = 100) {
    if (min > max) {
      let c = min;
      min = max;
      max = c;
    }
    if (min === max) return max;
    max += 1;

    const hashBN = new BN(Utils.remove0x(randomHash), 16);
    const divBN = new BN(max - min, 10);
    const divRes = hashBN.mod(divBN);

    return +divRes.mod + min;
  }

  sigRecover(raw_msg, signed_msg) {
    raw_msg = Utils.remove0x(raw_msg);
    return Eth._web3.eth.accounts.recover(raw_msg, signed_msg).toLowerCase();
  }

  sigHashRecover(raw_msg, signed_msg) {
    return Eth._web3.eth.accounts.recover(raw_msg, signed_msg).toLowerCase();
  }

  checkSig(raw_msg, signed_msg, need_address) {
    raw_msg = Utils.remove0x(raw_msg);
    return (
      need_address.toLowerCase() ===
      Eth._web3.eth.accounts.recover(raw_msg, signed_msg).toLowerCase()
    );
  }
  checkHashSig(raw_msg, signed_msg, need_address) {
    return (
      need_address.toLowerCase() ===
      Eth._web3.eth.accounts.recover(raw_msg, signed_msg).toLowerCase()
    );
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
  async ERC20ApproveSafe(spender: string, amount: number) {
    let allowance = await this._ERC20Contract.methods
      .allowance(this._account.address, spender)
      .call();
    if (0 < allowance && allowance < amount) {
      await this.ERC20Approve(spender, 0);
    }
    if (allowance < amount) {
      await this.ERC20Approve(spender, amount);
    }
  }
  async ERC20Approve(spender: string, amount: number) {
    const receipt = await this._ERC20Contract.methods
      .approve(spender, amount)
      .send({
        from: this._account.address,
        gasPrice: _config.network.gasPrice,
        gas: _config.network.gasLimit
      });

    if (
      typeof receipt === "undefined" ||
      !["0x01", "0x1", true].includes(receipt.status)
    ) {
      throw new Error(receipt);
    }
  }

  async getBalances(): Promise<LastBalances> {
    const { address } = this._account;
    this._cache.lastBalances.bet = await this.getBetBalance(address);
    this._cache.lastBalances.eth = await this.getEthBalance(address);
    return this._cache.lastBalances;
  }

  async getEthBalance(address): Promise<Balance> {
    if (!address) throw new Error("Empty address in ETH balance request");
    const weiBalance = await Eth._web3.eth.getBalance(address);
    const bnBalance: any = Eth._web3.utils.fromWei(weiBalance, "ether");
    return {
      balance: bnBalance.toNumber(),
      updated: Date.now()
    };
  }

  async getBetBalance(address): Promise<Balance> {
    if (!address) throw new Error("Empty address in BET balance request");
    const decBalance = await this._ERC20Contract.methods
      .balanceOf(address)
      .call();
    const balance = Utils.dec2bet(decBalance);
    return { balance, updated: Date.now() };
  }
}();
