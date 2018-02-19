import _config         from 'config'
import Rtc             from 'dc-messaging'
import Eth             from 'Eth'
import PaychannelLogic from './PayChannel'
import * as Utils      from '../utils'

const web3 = Eth.web3

// Max one-time clients for DApp
const max_users = 9


// Init ERC20 instance
const ERC20 = new web3.eth.Contract(
  _config.network.contracts.erc20.abi,
  _config.network.contracts.erc20.address
)

const ERC20approve = async function (spender, amount, callback = false) {
  return new Promise(async (resolve, reject) => {
    console.log('Check how many tokens user ' + Eth.acc.address + ' is still allowed to withdraw from contract ' + spender + ' . . . ')

    let allowance = await ERC20.methods.allowance(Eth.acc.address, spender).call()

    console.log('💸 allowance:', allowance)

    if (allowance < amount) {
      console.log('allowance lower than need deposit')

      console.group('Call .approve on ERC20')
      console.log('Allow paychannle to withdraw from your account, multiple times, up to the ' + amount + ' amount.')

      const receipt = await ERC20.methods.approve(
        spender,
        amount * 9
      ).send({
        from     : Eth.acc.address,
        gasPrice : _config.network.gasPrice,
        gas      : (await ERC20.methods.approve(spender, amount * 9).estimateGas({from : Eth.acc.address}))
      }).on('error', err => {
        console.error(err)
        reject(new Error(false, err))
      })

      console.log('📌 ERC20.approve receipt:', receipt)

      allowance = await ERC20.methods.allowance(Eth.acc.address, spender).call()

      console.log('💸💸💸 allowance:', allowance)

      console.groupEnd()
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
      console.error('Create DApp error', params)
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
    this.sharedRoom   = new Rtc((Eth.acc.address || false), 'dapp_room_' + this.hash)
    this.timer        = 10
    this.checkTimeout = 0

    if (params.contract) {
      console.log('Your contract is add')
      this.contract_address = params.contract.contract_address
      this.contract_abi     = params.contract.contract_abi
    } else {
      console.log('Standart payChannel contract is add')
      this.contract_address = _config.network.contracts.paychannel.address
      this.contract_abi     = _config.network.contracts.paychannel.abi
    }

    // Sending beacon messages to room
    // that means we are online
    const beacon = (t = 3000) => {
      // max users connected
      // dont send beacon
      if (Object.keys(this.users).length >= max_users) {
        setTimeout(() => { beacon(t) }, t)
        return false
      }

      Eth.getBetBalance(Eth.acc.address, bets => {
        // console.log('Beacon ' + Eth.acc.address + ' bets ', bets)
        this.sharedRoom.sendMsg({
          action  : 'bankroller_active',
          deposit : bets * 100000000,
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


  // User connect
  _newUser (params) {
    const connection_id = Utils.makeSeed()
    const user_id       = params.user_id

    if (this.users[user_id]) {
      this.users[user_id].logic = payChannelWrap(this.logic)

      setTimeout(() => {
        this.response(params, {id:this.users[user_id].id}, this.sharedRoom)
        console.log('User ' + user_id + ' REconnected to ' + this.slug)
      }, 999)

      return
    }

    this.users[user_id] = {
      id    : connection_id,
      num   : Object.keys(this.users).length,
      logic : payChannelWrap(this.logic),
      room  : new Rtc(Eth.acc.address, this.hash + '_' + connection_id)
    }

    const prepareArgs = async (args = []) => {
      args = args || []

      return new Promise(async (resolve, reject) => {
        let new_args = []
        for (let k in args) {
          let arg = args[k]
          if (arg && ('' + arg).indexOf('confirm') !== -1) {
            let seed = arg.split('confirm(')[1].split(')')[0]
            seed = Utils.remove0x(seed)
            const s = Eth.acc.sign(seed)
            arg = s.signature.substr(2)
          }

          new_args.push(arg)
        }

        resolve(new_args)
      })
    }

    // Listen personal user room messages
    const listen_all = async data => {
      if (!data || !data.action || !data.user_id || !this.users[data.user_id]) return

      let User = this.users[data.user_id]

      if (data.action === 'open_channel') {
        console.log('user room action open channel')
        this._openChannel(data)
      }
      if (data.action === 'close_channel') {
        console.log('user room action close channel')
        this._closeChannel(data)
      }
      if (data.action === 'update_state') {
        this._updateState(data)
      }
      if (data.action === 'reconnect') {
        console.log('User reconnect')
        this._reconnect(data)
      }
      if (data.action === 'close_timeout') { this.timer = 10 }

      // call user logic function
      if (data.action === 'call') {
        if (!data.func || !data.func.name || !data.func.args) return
        if (!User.logic[data.func.name]) return

        console.log('User.logic', User.logic)
        console.log('User.logic.payChannel', User.logic.payChannel)

        let args    = await prepareArgs(data.func.args)
        let returns = User.logic[data.func.name].apply(this, args)

        this.response(data, {
          args    : args,
          returns : returns
        }, User.room)

        return
      }

      if (data.action === 'disconnect') {
        console.log('User ' + data.user_id + ' disconnected')

        User.room.off('all', listen_all)
        delete (this.users[data.user_id])
        this.response(data, {disconnected:true}, User.room)
      }
    }
    this.users[user_id].room.on('all', listen_all)

    setTimeout(() => {
      this.response(params, {id:connection_id}, this.sharedRoom)
      console.log('User ' + user_id + ' connected to ' + this.slug)
    }, 999)
  }


  PayChannel () {
    if (this.PayChannelContract) return this.PayChannelContract

    let pay_contract_abi     = ''
    let pay_contract_address = ''

    if (typeof this.contract_address !== 'undefined' && typeof this.contract_abi !== 'undefined') {
      pay_contract_abi     = this.contract_abi
      pay_contract_address = this.contract_address
    }

    this.PayChannelContract = new web3.eth.Contract(pay_contract_abi, pay_contract_address)

    return this.PayChannelContract
  }

  async _openChannel (params) {
    const response_room = this.users[params.user_id].room

    console.log('!!!!!!!!!!!!',params.user_id)

    if (typeof params.open_args.gamedata === 'undefined') { console.error('Error! game data not found') }

    const channel_id         = params.open_args.channel_id
    const player_address     = params.open_args.player_address
    const bankroller_address = Eth.acc.address
    const player_deposit     = params.open_args.player_deposit
    const bankroller_deposit = params.open_args.player_deposit * 2
    const session            = 0 // params.open_args.session
    const ttl_blocks         = params.open_args.ttl_blocks
    const signed_args        = params.open_args.signed_args
    const paychannel         = new PaychannelLogic(parseInt(bankroller_deposit)) // eslint-disable-line

    // Check bankroller balance
    const bankroller_bets = Utils.bet2dec(await Eth.getBetBalance(bankroller_address))
    if (bankroller_bets < bankroller_deposit) {
      response_room.sendMsg({action:'info', 'info':'🚫 Bankroller have no money. Need ' + bankroller_deposit + ', have ' + bankroller_bets})
      console.error('🚫 Bankroller have no money. Need ' + bankroller_deposit + ', have ' + bankroller_bets)
      this.response(params, {error:'Bankroller have no money. Need ' + bankroller_deposit + ', have ' + bankroller_bets}, response_room)
      return
    }

    response_room.sendMsg({action:'info', 'info':'Approve ERC20 contract'})

    await ERC20approve(this.PayChannel().options.address, bankroller_deposit * 10000)

    this.player_address = player_address

    response_room.sendMsg({action:'info', 'info':'Check SIG'})
    const rec_openkey = web3.eth.accounts.recover(Utils.sha3(channel_id, player_address, bankroller_address, player_deposit, bankroller_deposit, session, ttl_blocks), signed_args)

    if (player_address !== rec_openkey) {
      response_room.sendMsg({action:'info', 'info':'🚫 invalid sig on open channel'})
      console.error('🚫 invalid sig on open channel', rec_openkey + '!=' + player_address)
      this.response(params, { error:'Invalid sig' }, response_room)
      // return
    }

    // estimateGas - в данном случае работает неккоректно и
    // возвращает лимит газа аж на целый блок
    // из-за чего транзакцию никто не майнит, т.к. она одна на весь блок
    // const gasLimit = await this.PayChannel().methods.open(channel_id,player_address,bankroller_address,player_deposit,bankroller_deposit,session,ttl_blocks, signed_args).estimateGas({from: Eth.acc.address})
    const gasLimit = 900000

    console.log('Send open channel trancsaction')
    console.log('⛽ gasLimit:', gasLimit)

    response_room.sendMsg({action:'info', 'info':'Send open channel trancsaction'})

    const receipt = await this.PayChannel().methods
      .openChannel(
        channel_id, // random bytes32 id
        player_address,
        bankroller_address,
        player_deposit,
        bankroller_deposit,
        session, // integer num/counter
        ttl_blocks, // channel ttl in blocks count
        [], // game_data
        signed_args
      ).send({
        gas      : gasLimit,
        gasPrice : 1.4 * _config.network.gasPrice,
        from     : Eth.acc.address
      })
      .on('transactionHash', transactionHash => {
        response_room.sendMsg({action:'info', 'info':'# openchannel TX pending https://ropsten.etherscan.io/tx/' + transactionHash})
        console.log('# openchannel TX pending', transactionHash)
        console.log('https://ropsten.etherscan.io/tx/' + transactionHash)
        console.log('⏳ wait receipt...')
      })
      .on('error', err => {
        console.warn('Open channel error', err)
        this.response(params, { error:'cant open channel', more:err }, response_room)
      })

    console.log('open channel result', receipt)

    // TODO
    // let run = ''
    // const checkTimeout = setTimeout(run = () => {
    // if (this.timer === 0) { this._closeByTimeout(checkTimeout) }
    // this.timer--
    // setTimeout(run, 1000)
    // }, 1000)


    if (receipt.transactionHash) {
      // Set deposit in logic
      console.log('complete', player_address);
      
      this.users[player_address].paychannel = {
        channel_id         : channel_id,
        player_deposit     : player_deposit,
        bankroller_deposit : bankroller_deposit,
        session            : session
      }
      console.log('complete', this.users[player_address]);
  
      this.users[player_address].logic.payChannel.setDeposit(Utils.dec2bet(player_deposit))
      this.response(params, { receipt:receipt }, response_room)
    }

  }

  async _closeChannel (params) {
    const response_room      = this.users[params.user_id].room
    const player_address     = params.close_args.player_address
    const channel_id         = params.close_args.channel_id         // bytes32 id,
    const player_balance     = params.close_args.player_balance     // uint playerBalance,
    const bankroller_balance = params.close_args.bankroller_balance // uint bankrollBalance,
    const session            = 0                                    // uint session=0px
    const signed_args        = params.close_args.signed_args
    // const bool            =  params.close_args.bool
    
    response_room.sendMsg({action:'info', 'info':'check signature'})
    console.log('__params__',this.users[player_address])
    
    // Check Sig
    // const hash         = Utils.sha3(channel_id, player_balance, bankroller_balance, session)
    // const rec_openkey  = web3.eth.accounts.recover(hash, signed_args)

    // TODO: demo block
    // if (params.user_id != rec_openkey) {
    //  console.error('🚫 invalid sig on open channel', rec_openkey)
    //  this.response(params, { error:'Invalid sig' }, response_room)
    //  return
    // }

    // Check user results with out results
    const channel     = this.users[player_address].paychannel
    const user_profit = this.users[player_address].logic.payChannel._getProfit()

    const l_player_balance     = Utils.bet2dec(this.users[player_address].logic.payChannel.getBalance()) // user_profit + channel.player_deposit
    const l_bankroller_balance = Utils.bet2dec(this.users[player_address].logic.payChannel.getBankrollBalance())// -user_profit + channel.bankroller_deposit

    if (l_player_balance !== player_balance || l_bankroller_balance !== bankroller_balance) {
      console.error('Invalid profit', {
        l_player_balance     : l_player_balance,
        player_balance       : player_balance,
        l_bankroller_balance : l_bankroller_balance,
        bankroller_balance   : bankroller_balance
      })
      this.response(params, { error:'Invalid profit' }, response_room)
      return
    }

    const gasLimit = 4600000
    console.log('Send close channel trancsaction')
    console.log('⛽ gasLimit:', gasLimit)

    response_room.sendMsg({action:'info', 'info':'Send close channel trancsaction'})
    const receipt = await this.PayChannel().methods
      .closeByConsent(
        channel_id,
        player_balance,
        bankroller_balance,
        session,
        true,
        signed_args
      ).send({
        gas      : gasLimit,
        gasPrice : 1.4 * _config.network.gasPrice,
        from     : Eth.acc.address
      })
      .on('transactionHash', transactionHash => {
        console.log('# closechannel TX pending', transactionHash)
        console.log('https://ropsten.etherscan.io/tx/' + transactionHash)
        console.log('⏳ wait receipt...')
        response_room.sendMsg({action:'info', 'info':'# closechannel TX pending https://ropsten.etherscan.io/tx/' + transactionHash})
      })
      .on('error', err => {
        console.warn('Close channel error', err)
        this.response(params, { error:'cant close channel', more:err }, response_room)
      })

    console.log('Close channel receipt', receipt)
    if (receipt.transactionHash) {
      this.users[params.user_id].logic.payChannel.reset()
      delete this.users[params.user_id].paychannel
    }

    this.response(params, { receipt:receipt }, response_room)
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
    const player_address     = params.update_args.player_address
    const player_balance     = params.update_args.player_balance
    const bankroller_balance = params.update_args.bankroller_balance
    const session            = params.update_args.session
    const signed_args        = params.update_args.signed_args
    const bool               = params.update_args.bool

    this.users['state_data'] = {
      channel_id         : channel_id,
      player_address     : player_address,
      player_balance     : player_balance,
      bankroller_balance : bankroller_balance,
      session            : session,
      bool               : bool,
      signed_args        : signed_args
    }

    const rec_openkey = web3.eth.accounts.recover(Utils.sha3(channel_id, player_balance, bankroller_balance, session, bool), signed_args)

    if (player_address !== rec_openkey) {
      console.error('🚫 invalid sig on update state', rec_openkey)
      this.response(params, { error:'Invalid sig' }, response_room)
      return
    }

    const signed_bankroller = Eth.signHash(Utils.sha3(channel_id, player_balance, bankroller_balance, session))

    this.response(params, {signed_bankroller:signed_bankroller}, response_room)
  }

  // Send message and wait response
  request (params, callback = false, Room = false) {
    Room = Room || this.users[this.users.state_data.player_address].room

    if (!Room) {
      console.error('request room not set!')
      return
    }

    return new Promise((resolve, reject) => {
      const uiid  = Utils.makeSeed()

      params.type = 'request'
      params.uiid = uiid

      // Send request
      console.log(params)
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
      console.error('request roo not set!')
      return
    }

    request_data.response = response
    request_data.type     = 'response'

    Room.send(request_data)
  }
}
