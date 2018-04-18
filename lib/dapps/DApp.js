/* global DCLib */

import _config         from 'config'
import * as messaging  from 'dc-messaging'
import Eth             from 'Eth'
import RSA             from '../rsa'
import PaychannelLogic from './PayChannel'
import * as Utils      from '../utils'

const web3 = Eth.web3

// Max one-time clients for DApp
const max_users = 9

messaging.upIPFS(_config.network.signal)

// Init ERC20 instance
const ERC20 = new web3.eth.Contract(
  _config.network.contracts.erc20.abi,
  _config.network.contracts.erc20.address
)

const ERC20approve = async function (spender, amount, callback = false) {
  return new Promise(async (resolve, reject) => {
    let allowance = await ERC20.methods.allowance(Eth.acc.address, spender).call()

    if (allowance < amount || (amount === 0 && allowance !== 0)) {
      const receipt = await ERC20.methods.approve(
        spender,
        amount
      ).send({
        from     : Eth.acc.address,
        gasPrice : _config.network.gasPrice,
        gas      : _config.network.gasLimit 
      }).on('error', err => {
        Utils.debugLog(err, 'error')
        reject(new Error(false, err))
      })

      if (receipt.status !== '0x01') {
        reject(new Error(receipt, err))
        return
      }
    }

    resolve(true, null)
    if (callback) callback()
  })
}

// Inject paychannel methods in DApp logic
const payChannelWrap = function (Logic) {
  let payChannel             = new PaychannelLogic()
  Logic.prototype.payChannel = payChannel
  let modifiedLogic          = new Logic()
  modifiedLogic.payChannel   = payChannel
  return modifiedLogic
}

/*
 * DApp constructor
 */
export default class DApp {
  constructor (params) {
    if (!params.slug) {
      Utils.debugLog(['Create DApp error', params], 'error')
      throw new Error('slug option is required')
    }

    if (!global.DAppsLogic || !global.DAppsLogic[params.slug]) {
      throw new Error('Cant find DApp logic')
    }
    
    this.slug         = params.slug
    this.code         = params.slug || params.code
    this.logic        = global.DAppsLogic[this.slug]
    this.hash         = Utils.checksum(this.slug)
    this.users        = {}
    this.sharedRoom   = new messaging.RTC((Eth.acc.address || false), 'dapp_room_' + this.hash)
    this.timer        = 10
    this.checkTimeout = 0

    if (params.contract) {
      Utils.debugLog('Your contract is add', _config.loglevel)
      this.contract_address = params.contract.address
      this.contract_abi     = params.contract.abi
    } else {
      Utils.debugLog('Standart payChannel contract is add', _config.loglevel, false)
      this.contract_address = _config.network.contracts.paychannel.address
      this.contract_abi     = _config.network.contracts.paychannel.abi
    }

    this.PayChannel = new web3.eth.Contract(this.contract_abi, this.contract_address)
    this.approveGameContract( this.PayChannel.options.address )


    // Sending beacon messages to room
    // that means we are online
    let log_beacon = 0
    const beacon = (t = 3000) => {
      // max users connected
      // dont send beacon
      if (Object.keys(this.users).length >= max_users) {
        setTimeout(() => { beacon(t) }, t)
        return false
      }

      // Utils.debugLog('Eth.getBetBalance')
      Eth.getBetBalance(Eth.acc.address, bets => {
        if (log_beacon < 5) Utils.debugLog('Beacon ' + Eth.acc.address + ' bets ' + bets, _config.loglevel); log_beacon++
        
        this.sharedRoom.sendMsg({
          action  : 'bankroller_active',
          deposit : Utils.bet2dec(bets), // bets * 100000000,
          dapp    : {
            slug : this.slug,
            hash : this.hash
          }
        })
        setTimeout(() => { beacon(t) }, t)
      })
    }
    beacon(3000)

    // Listen users actions
    this.sharedRoom.on('all', data => {
      if (!data || !data.action || data.action === 'bankroller_active') { return }

      // User want to connect
      if (data.action === 'connect' && data.slug === this.slug) {
        this._newUser(data)
      }
    })
  }

  async approveGameContract (address, amount = 100000000) {
    amount = '' + amount
    await ERC20approve(this.PayChannel.options.address, 0)
    await ERC20approve(this.PayChannel.options.address, web3.utils.toWei(amount))
  }

  // User connect
  async _newUser (params) {
    const connection_id = Utils.makeSeed()
    const user_id       = params.user_id

   
    if (this.users[user_id]) {
      this.users[user_id].logic = payChannelWrap(this.logic)

      setTimeout(() => {
        this.response(params, {
          id : this.users[user_id].id
        }, this.sharedRoom)
        Utils.debugLog('User ' + user_id + ' Reconnected to ' + this.slug, _config.loglevel)
      }, 999)

      return
    }

    this.users[user_id] = {
      id    : connection_id,
      num   : Object.keys(this.users).length,
      logic : payChannelWrap(this.logic),
      room  : new messaging.RTC(Eth.acc.address, this.hash + '_' + connection_id)
    }


    // Listen personal user room messages
    const listen_all = async data => {
      if (!data || !data.action || !data.user_id || !this.users[data.user_id]) return

      let User = this.users[data.user_id]

      if (data.action === 'open_channel') {
        Utils.debugLog('user room action open channel 1:', _config.loglevel)
        this._openChannel(data)
      }
      if (data.action === 'check_open_channel') {
        Utils.debugLog('check that channel open (2):', _config.loglevel)
        this._checkOpenChannel(data)
      }
      if (data.action === 'close_channel') {
        Utils.debugLog('user room action close channel', _config.loglevel)
        this._closeChannel(data)
      }
      if (data.action === 'update_state') {
        this._updateState(data)
      }
      if (data.action === 'update_channel') {
        this._updateChannel(data)
      }
      if (data.action === 'reconnect') {
        Utils.debugLog('User reconnect', _config.loglevel)
        this._reconnect(data)
      }
      if (data.action === 'close_timeout') { this.timer = 10 }

      // call user logic function
      if (data.action === 'call') {
        this._call(data)
        return
      }

      if (data.action === 'disconnect') {
        Utils.debugLog('User ' + data.user_id + ' disconnected', _config.loglevel)

        User.room.off('all', listen_all)
        delete (this.users[data.user_id])
        this.response(data, {disconnected:true}, User.room)
      }
    }
    this.users[user_id].room.on('all', listen_all)

    setTimeout(async () => {
      if (connection_id) {
        this.response(params, { id : connection_id}, this.sharedRoom)
        Utils.debugLog('User ' + user_id + ' connected to ' + this.slug, _config.loglevel)
      }

    }, 999)
  }

  async _openChannel (params) {
    const gameXbets = 2 // TODO: брать из настроек игры

    if (typeof params.args !== 'object' || !params.args.player_address) return

    const user = this.users[params.args.player_address]
    if (!user) return
    const response_room = user.room
   
    // Create RSA keys for user
    user.RSA = new RSA()
    await user.RSA.generateRSAkey()

    // Args for open channel transaction
    const args = { 
      channel_id         : params.args.channel_id,
      player_address     : params.args.player_address,
      bankroller_address : Eth.acc.address,
      player_deposit     : params.args.player_deposit,
      bankroller_deposit : params.args.player_deposit * gameXbets,
      opening_block      : await web3.eth.getBlockNumber(),
      game_data          : params.args.game_data,
      _N                 : '0x'  + user.RSA.RSA.n.toString(16),
      _E                 : '0x0' + user.RSA.RSA.e.toString(16)
    }

    const to_sign = [
      {t: 'bytes32' , v: args.channel_id               }   ,
      {t: 'address' , v: args.player_address           }   ,
      {t: 'address' , v: args.bankroller_address       }   ,
      {t: 'uint'    , v: '' + args.player_deposit      }   ,
      {t: 'uint'    , v: '' + args.bankroller_deposit  }   ,
      {t: 'uint'    , v: args.opening_block            }   ,
      {t: 'uint'    , v: args.game_data                }   ,
      {t: 'bytes'   , v: args._N                       }   ,
      {t: 'bytes'   , v: args._E                       }  
    ]

    const signed_args = Eth.signHash( Utils.sha3( ...to_sign ) )

    this.response(params, { args:args, signed_args:signed_args}, response_room)

    this.users[args.player_address].paychannel = {
      session            : 0,
      channel_id         : args.channel_id,
      player_deposit     : args.player_deposit,
      bankroller_deposit : args.bankroller_deposit
    }
  }

  async _checkOpenChannel (data) {
    const user = this.users[data.user_id]
    if (!user || !user.paychannel) return

    const l_channel     = user.paychannel
    const response_room = user.room
    

    const channel = await this.PayChannel.methods.channels(l_channel.channel_id).call()

    if (channel.open && 
      channel.player.toLowerCase() === data.user_id.toLowerCase() &&
      channel.bankroller.toLowerCase() === Eth.acc.address.toLowerCase() &&
      '' + channel.playerBalance === '' + l_channel.player_deposit &&
      '' + channel.bankrollerBalance === '' + l_channel.bankroller_deposit
    ) {
      this.users[data.user_id].paychannel.info = channel
      this.response(data, { status:'ok', info:channel, error:null }, response_room)
    } else {
      this.response(data, { error:'channel not found'}, response_room)
    }
  }

  async _call (data) {
    const user = this.users[data.user_id]
    if (!data.data || !data.data.gamedata || !data.data.seed) return
    if (!data.func || !data.func.name || !data.func.args) return
    if (!user.logic[data.func.name]) return

    // сверяем номер сессии
    user.paychannel.session++
    if (data.data.session * 1 !== user.paychannel.session * 1) {
      // TODO: openDispute
      return 0
    }

    // проверка подписи
    const to_verify_hash = [
      {t: 'bytes32', v: user.paychannel.channel_id },
      {t: 'uint',    v: user.paychannel.session    },
      {t: 'uint',    v: '' + data.data.user_bet    },
      {t: 'uint',    v: data.data.gamedata         },
      {t: 'bytes32', v: data.data.seed             }
    ]
    const recover_openkey = web3.eth.accounts.recover(Utils.sha3(...to_verify_hash), data.sign)
    if (recover_openkey.toLowerCase() !== data.user_id.toLowerCase()) {
      console.error('Invalid sig!')
      console.log( data )
      return
    }


    const confirmRandom = function (data) {
      let rnd_o = {}
      let rnd_i = false
      for (let k in data.func.args) {
        let a = data.func.args[k]
        if (typeof a === 'object' && typeof a.rnd === 'object') {
          rnd_i = k
          rnd_o = a.rnd
          break
        }
      }

      let args = data.func.args.slice(0)
      
      const rnd_hash_args = [
        {t: 'bytes32', v: user.paychannel.channel_id   },
        {t: 'uint',    v: user.paychannel.session      },
        {t: 'uint',    v: '' + rnd_o.bet               },
        {t: 'uint',    v: rnd_o.gamedata               },
        {t: 'bytes32', v: data.data.seed               }
      ]

      let rnd_hash
      try {
        rnd_hash = Utils.sha3(...rnd_hash_args)
      } catch (e) {
        console.error('Cant get sha3 from rnd_hash_args', e)
        console.log(rnd_hash_args)
        return false
      }

      let rnd_sign
      try {
        rnd_sign = user.RSA.signHash( rnd_hash ).toString(16)
      } catch (e) {
        console.error('Cant RSA.signHash from rnd_hash', e)
        return false
      }

      const rnd = Utils.sha3(rnd_sign)

      args[rnd_i] = rnd

      return {
        args     : args,
        rnd_hash : rnd_hash,
        rnd_sign : rnd_sign,
        rnd      : rnd
      }
    }

    const confirmed = confirmRandom(data)
    if (!confirmed) return 

    let returns = false
    try {
      returns = user.logic[data.func.name].apply(this, confirmed.args)
    } catch (e) {
      console.error('Cant call gamelogic function ' + data.func.name)
      console.error('with args ' + confirmed.args)
      console.error(e)
    }

    if (returns) {
      this.response(data, {
        args     : confirmed.args,
        rnd_hash : confirmed.rnd_hash,
        rnd_sign : confirmed.rnd_sign,
        returns  : returns
      }, user.room)
    }
  }

  async _closeChannel (params) {
    const response_room      = this.users[params.user_id].room
    const player_address     = params.close_args.player_address
    const channel_id         = params.close_args.channel_id         // bytes32 id,
    const player_balance     = params.close_args.player_balance     // uint playerBalance,
    const bankroller_balance = params.close_args.bankroller_balance // uint bankrollBalance,
    const session            = params.close_args.session                                    // uint session=0px
    const signed_args        = params.close_args.signed_args
    const bool               = params.close_args.bool
    const totalAmount        = params.close_args.totalAmount

    response_room.sendMsg({action:'info', 'info':'check signature'})

    // Check Sig
    const hash = Utils.sha3(channel_id, player_balance, bankroller_balance, totalAmount, session, bool)
    // Utils.debugLog('hash ' + session, _config.loglevel)
    // const rec_openkey  = web3.eth.accounts.recover(hash, signed_args)

    // TODO: demo block
    if (!DCLib.checkHashSig(hash, signed_args, player_address)) {
      console.error('🚫 invalid sig on open channel')
      this.response(params, { error:'Invalid sig' }, response_room)
      return
    }

    // Check user results with out results
    // const channel     = this.users[player_address].paychannel
    // const user_profit = this.users[player_address].logic.payChannel._getProfit()

    const l_player_balance     = Utils.bet2dec(this.users[player_address].logic.payChannel.getBalance()) // user_profit + channel.player_deposit
    const l_bankroller_balance = Utils.bet2dec(this.users[player_address].logic.payChannel.getBankrollBalance())// -user_profit + channel.bankroller_deposit

    if (l_player_balance !== player_balance || l_bankroller_balance !== bankroller_balance) {
      Utils.debugLog(['Invalid profit', {
        l_player_balance     : l_player_balance,
        player_balance       : player_balance,
        l_bankroller_balance : l_bankroller_balance,
        bankroller_balance   : bankroller_balance
      }], 'error')
      this.response(params, {error:'Invalid profit'}, response_room)
      return
    }

    const gasLimit = 460000
    Utils.debugLog('Send close channel trancsaction', _config.loglevel)
    Utils.debugLog(['⛽ gasLimit: ', gasLimit], _config.loglevel)

    response_room.sendMsg({action:'info', 'info':'Send close channel trancsaction'})
    const receipt = await this.PayChannel.methods
      .closeByConsent(
        channel_id,
        player_balance,
        bankroller_balance,
        totalAmount,
        session,
        bool,
        signed_args
      ).send({
        gas      : gasLimit,
        gasPrice : 1.2 * _config.network.gasPrice,
        from     : Eth.acc.address
      })
      .on('transactionHash', transactionHash => {
        Utils.debugLog(['# closechannel TX pending ', transactionHash], _config.loglevel)
        Utils.debugLog('https://ropsten.etherscan.io/tx/' + transactionHash, _config.loglevel)
        Utils.debugLog('⏳ wait receipt...', _config.loglevel)
        response_room.sendMsg({action:'info', 'info':'# closechannel TX pending https://ropsten.etherscan.io/tx/' + transactionHash})
      })
      .on('error', err => {
        Utils.debugLog(['Close channel error', err], 'error')
        this.response(params, { error:'cant close channel', more:err }, response_room)
      })

    Utils.debugLog(['Close channel receipt ', receipt], _config.loglevel)
    if (receipt.transactionHash) {
      this.users[params.user_id].logic.payChannel.reset()
      delete this.users[params.user_id].paychannel
      this.response(params, { receipt:receipt }, response_room)
    }

  }

  async _closeByTimeout (checkTimeout) {
    clearTimeout(checkTimeout)

    const bankroller_balance = this.users.state_data.bankroller_balance
    const player_address     = this.users.state_data.player_address
    const channel_id         = this.users.state_data.channel_id
    const player_balance     = this.users.state_data.player_balance
    const session            = this.users.state_data.session
    const bool               = this.users.state_data.bool
    const signed_args        = this.users.state_data.signed_args
    // const response_room      = this.users[player_address].room

    const receipt = await this.request({action: 'timeout', data: {msg:'msg'}}) // eslint-disable-line

    this._closeChannel({
      user_id    : player_address,
      close_args : {
        channel_id         : channel_id,
        player_balance     : player_balance,
        bankroller_balance : bankroller_balance,
        session            : session,
        bool               : bool,
        signed_args        : signed_args
      }
    })
  }

  _updateState (params, callback = false) {
    const response_room      = this.users[params.update_args.player_address].room
    const channel_id         = params.update_args.channel_id
    const session            = params.update_args.session
    const player_amount      = params.update_args.player_amount
    const player_num         = params.update_args.player_num
    const random_hash        = params.update_args.random_hash
    const signed_args        = params.update_args.signed_args
    const player_address     = params.update_args.player_address

    this.users['state_data'] = {
      channel_id         : channel_id,
      player_amount      : player_amount,
      player_num         : player_num,
      session            : session,
      random_hash        : random_hash,
      signed_args        : signed_args
    }

    const hash = Utils.sha3(channel_id, session, player_amount, player_num, random_hash)

    if (!DCLib.checkHashSig(hash, signed_args, player_address)) {
      Utils.debugLog(['🚫 invalid sig on update state ', player_address], 'error')
      this.response(params, { error:'Invalid sig' }, response_room)
      return
    }

    this.bankrollRSA.generateRSAkey()

    const bankroller_rsa_n     = this.bankrollRSA.RSA.n.toString(16)
    const signed_bankroller    = Eth.signHash(hash)
    const signedRSA_bankroller = this.bankrollRSA.signHash(signed_args).toString(16)
    
    this.response(params, {
      signed_bankroller:signed_bankroller,
      signedRSA_bankroller:signedRSA_bankroller,
      bankroller_rsa_n:bankroller_rsa_n
    }, response_room)
  }

  _updateChannel (params, callback = false) {
    const response_room      = this.users[params.player_address].room
    const player_address     = params.player_address
    const bankroller_balance = params.update_args.bankroller_balance
    const player_balance     = params.update_args.player_balance
    // const total_amount       = params.update_args.total_amount
    const channel_id         = params.update_args.channel_id
    const session            = params.update_args.session
    const signed_args        = params.update_args.signed_args

    const hash = Utils.sha3(channel_id, player_balance, bankroller_balance, /* total_amount, */ session)

    if (!DCLib.checkHashSig(hash, signed_args, player_address)) {
      Utils.debugLog(['🚫 invalid sig on update state ', player_address], 'error')
      this.response(params, { error:'Invalid sig' }, response_room)
    }

    const bankroller_sign = Eth.signHash(hash)
    this.response(params, { bankroller_sign : bankroller_sign + 's' }, response_room)
  }

  // Send message and wait response
  request (params, callback = false, Room = false) {
    Room = Room || this.users[this.users.state_data.player_address].room

    if (!Room) {
      Utils.debugLog('request room not set!', 'error')
      return
    }

    return new Promise((resolve, reject) => {
      const uiid  = Utils.makeSeed()

      params.type = 'request'
      params.uiid = uiid

      // Send request
      Utils.debugLog(params, _config.loglevel)
      Room.send(params, delivered => {
        if (!delivered) {
          reject(new Error('🙉 Cant send msg to bankroller, connection error'))
        }
      })

      // Wait response
      Room.once('uiid::' + uiid, result => {
        if (callback) callback(result)
        resolve(result.response)
      })
    })
  }

  // Response to request-message
  response (request_data, response, Room = false) {
    if (!Room) {
      Utils.debugLog('request roo not set!', 'error')
      return
    }

    request_data.response = response
    request_data.type     = 'response'

    Room.send(request_data)
  }
}
