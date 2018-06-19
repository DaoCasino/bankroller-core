import _config    from '../config.js'
import WEB3       from 'web3'
import DB         from 'DB.js'
import fetch      from 'node-fetch'
import {sign as signHash} from 'web3-eth-accounts/node_modules/eth-lib/lib/account.js'
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
  }

  async initAccount (callback = false) {
    let privateKey = await DB.get('privateKey')

    if (!privateKey) {
      privateKey = await this.getAccountFromServer() || this.web3.eth.accounts.create().privateKey
    }

    await DB.set('privateKey', privateKey)

    this.acc = web3.eth.accounts.privateKeyToAccount( privateKey )
    web3.eth.accounts.wallet.add( privateKey )

    if (callback) callback(this.acc)
    return true
  }

  signHash (hash) {
    hash = Utils.add0x(hash)
    if (!this.web3.utils.isHexStrict(hash)) {
      Utils.debugLog(hash + ' is not correct hex', _config.loglevel)
      Utils.debugLog('Use DCLib.Utils.makeSeed or Utils.soliditySHA3(your_args) to create valid hash', _config.loglevel)
    }

    return signHash(hash, Utils.add0x( this.acc.privateKey ))
  }

  getAccountFromServer () {
    if (_store.account_from_server) {
      if (_store.account_from_server === 'wait') {
        return new Promise((resolve, reject) => {
          let waitTimer = () => {
            setTimeout(() => {
              if (_store.account_from_server.privateKey) {
                resolve(_store.account_from_server)
              } else {
                waitTimer()
              }
            }, 1000)
          }
          waitTimer()
        })
      }
      return
    }

    _store.account_from_server = 'wait'

    return fetch(_config.faucet.get_acc_url).then(res => {
      return res.json()
    }).then(acc => {
      Utils.debugLog(['Server account data: ', acc], _config.loglevel)
      _store.account_from_server = acc
      return acc.privateKey
    }).catch(e => {
      return false
    })
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
    console.log('run')
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
