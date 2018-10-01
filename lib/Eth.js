import _config    from '../config.js'
import WEB3       from 'web3'
import DB         from 'DB.js'
import fetch      from 'node-fetch'
import * as ETHLib from 'eth-lib/lib/account.js'
// import {sign as signHash} from 'eth-lib/lib/account.js'
import * as Utils from './utils'


const _store = {}

const web3 = new WEB3(new WEB3.providers.HttpProvider(_config.network.rpc_url))

export default new class Eth {
  constructor () {
    this.web3  = web3
    this.cache = {}

    // Init ERC20 contract
    this.ERC20 = new this.web3.eth.Contract(
      _config.network.contracts.erc20.abi,
      _config.network.contracts.erc20.address
    )

    console.log(' CONFIG: ')
    console.log(_config)
    console.log('')
  }

  async initAccount (callback = false) {
    let privateKey = await DB.get('privateKey')

    if (!privateKey && !_config.privateKey) {
      console.error(`Bankroller account PRIVATE_KEY required!`)
      console.info(`set ENV variable privateKey`)

      if (process.env.DC_NETWORK === 'ropsten') {
        console.info(`You can get account with test ETH and BETs , from our faucet https://faucet.dao.casino/
          or use this random ${this.web3.eth.accounts.create().privateKey} , but send Ropsten ETH and BETs for them
        `)
      } else if (process.env.DC_NETWORK === 'sdk') {
        console.info(`For local SDK env you can use this privkey: 0x8d5366123cb560bb606379f90a0bfd4769eecc0557f1b362dcae9012b548b1e5`)
      } else {
        console.info(`You can use this privkey: ${this.web3.eth.accounts.create().privateKey}, but be sure that account have ETH and BETs `)
      }

      process.exit()
    }

    privateKey = '' + _config.privateKey

    await DB.set('privateKey', privateKey)

    this.acc = web3.eth.accounts.privateKeyToAccount( privateKey )
    web3.eth.accounts.wallet.add( privateKey )

    this.getBalances(this.acc.address,
      balance => console.log(`Acc balance ${this.acc.address} BETS: ${balance.bets} ETH: ${balance.eth}`))

    if (callback) callback(this.acc)
    return true
  }

  signHash (hash) {
    hash = Utils.add0x(hash)
    if (!this.web3.utils.isHexStrict(hash)) {
      Utils.debugLog(hash + ' is not correct hex', _config.loglevel)
      Utils.debugLog('Use DCLib.Utils.makeSeed or Utils.soliditySHA3(your_args) to create valid hash', _config.loglevel)
    }

    return ETHLib.sign(hash, Utils.add0x( this.acc.privateKey ))
  }

  checkHashSig (rawMsg, signedMsg, needAddress) {
    return (needAddress.toLowerCase() === ETHLib.recover(rawMsg, signedMsg).toLowerCase())
  }

  async getBalances (address, callback = false) {
    const [bets, eth] = await Promise.all([
      this.getBetBalance(address),
      this.getEthBalance(address)
    ]).catch(( ) => {
      return this.last_balances || [0,0]
    })

    this.cache.last_balances = [bets, eth]

    const res = { bets:bets, eth:eth }

    if (callback) callback(res)
    return res
  }

  getEthBalance (address = false, callback = false) {
    address = address || this.acc.address
    if (!address) return

    return new Promise((resolve, reject) => {
      this.web3.eth.getBalance(address).then(value => {
        const balance = this.web3.utils.fromWei(value)
        resolve(balance)
        if (callback) callback(balance)
      }).catch(err => {
        Utils.debugLog(['Err ', err], 'error')
        reject(err)
      })
    })
  }

  getBetBalance (address = false, callback = false) {
    address = address || this.acc.address
    if (!address) return

    return new Promise((resolve, reject) => {
      if (
        this.cache.bet_upd &&
        30 * 1000 > new Date().getTime() - this.cache.bet_upd
      ) {
        resolve(this.cache.bet)
      }

      this.ERC20.methods.balanceOf(address).call().then(value => {
        const balance = Utils.dec2bet(value)

        this.cache.bet     = balance
        this.cache.bet_upd = new Date().getTime()

        resolve(balance)
        if (callback) callback(balance)
      }).catch(err => {
        if (this.cache.bet) resolve(this.cache.bet)

        Utils.debugLog(['Err ', err], 'error')
        reject(new Error(err))
      })
    })
  }
}()
