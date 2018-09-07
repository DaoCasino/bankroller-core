import * as Utils from '../utils'
import _config    from 'config'

/** max items in history */
const h_max = 100


export default class PayChannel {
  constructor () {
    this.deposit = {
      player     : null,
      bankroller : null
    }
    this.balance = {
      player     : 0,
      bankroller : 0
    }
    this._profit  = 0
    this._history = []
  }

  _setDeposits (player, bankroller) {
    if (this.deposit.player !== null) {
      console.warn('Deposit allready set')
    }

    this.deposit.player     = +player
    this.deposit.bankroller = +bankroller
    this.balance.player     = 1 * this.deposit.player
    this.balance.bankroller = 1 * this.deposit.bankroller

    return this.balance
  }

  _getBalance () {
    return this.balance
  }

  _getProfit () {
    return this._profit
  }


  getDeposit () {
    return Utils.dec2bet(this.deposit.player)
  }

  getBalance () {
    return Utils.dec2bet(this.balance.player)
  }

  getBankrollBalance () {
    return Utils.dec2bet(this.balance.bankroller)
  }

  getProfit () {
    return Utils.dec2bet(this._profit)
  }

  updateBalance (p) {
    return this.addTX(p)
  }

  addTX (p) {
    this._profit += p * 1
    this.balance.player     = this.deposit.player     + this._profit
    this.balance.bankroller = this.deposit.bankroller - this._profit

    this._history.push({
      profit    : p,
      balance   : this.balance.player,
      timestamp : new Date().getTime()
    })

    this._history = this._history.splice(-h_max)

    return this._profit
  }

  printLog () {
    if (_config.loglevel !== 'none') {
      console.groupCollapsed('Paychannel state:')
      console.table({
        Deposit          : this.getDeposit(),
        Player_balance   : this.getBalance(),
        Bankroll_balance : this.getBankrollBalance(),
        Profit           : this.getProfit()
      })
      console.groupCollapsed('TX History, last ' + h_max + ' items ' + this._history.length)
      Utils.debugLog(this._history, _config.loglevel)
      console.groupEnd()
      console.groupEnd()
    }
    return this._history
  }

  reset () {
    Utils.debugLog('PayChannel::reset, set deposit balance profit to 0', _config.loglevel)
    this.deposit.player     = null
    this.deposit.bankroller = null
    this.balance.player     = 0
    this.balance.bankroller = 0
    this._profit            = 0
    this._history.push({reset:true, timestamp:new Date().getTime()})
  }
}
