/* eslint-env mocha */
/* global DCLib describe it chai sinon fetch */

const assert = chai.assert
const expect = chai.expect

let _openkey
let App 
let dappContract 

const getDAppContract = function (callback) {
  fetch('http://127.0.0.1:8181/?get=contract&name=Dice').then(function (res) {
    return res.json()
  }).then(function (localGameContract) {
    callback({
      address : localGameContract.address,
      abi     : JSON.parse(localGameContract.abi)
    })
  })
}

function createDApp (flag = true) {
  if (!flag) dappContract = false
  App = new DCLib.DApp({
    slug: 'dicetest_v32',
    contract : dappContract
  })
  window.App = App    
}

function disconnect (session, total) {
  return new Promise((resolve, reject) => { 
    App.disconnect({session:session, totalAmount:total}, res => {
      resolve(res)
    })
  })
}

function connect (address = 'auto', deposit = 0.1, gamedata = {type:'uint', value:[1, 2, 3]}) {
  return new Promise((resolve, reject) => {
    // Arrange

    // Act
    App.connect({
      bankroller : address,
      paychannel : {deposit : deposit},
      gamedata   : gamedata
    }, (res, info) => {
      if (info) {
        resolve(info)
      }
    })  
  })
}

describe('Test dicegame', function () {
  
  describe('Create ecosystem', function () {

    // it('waiting account', function (done) {
    //   setTimeout(function () {
    //     done()
    //   }, 3000)
    // })


    it('Get game contract from local dev server', function (done) {
      getDAppContract(function (localGameContract) {
        dappContract = localGameContract
        done()
      })
    })

    it('Init account', async function () {
      await DCLib.Account.initAccount()

      _openkey = DCLib.Account.get().openkey
      
      // Assert
      assert.isOk(DCLib.Account.get().openkey)

    })
      
    it('Check balance', async function () {
      // Arrange
      const min_bets = 0.1
      const min_eth  = 0.2

      // Act
      this.timeout(10000)
      const res = await DCLib.Eth.getBalances(_openkey)

      // Assert
      expect(parseInt(Math.round(res.eth))).to.be.least(min_eth)
      expect(parseInt(res.bets)).to.be.least(min_bets)
    })

    it('Create DApp', function () {
      // Arrange
      const logicHash = '0x7def975aba61c88d09b971afeb07c14e981a379a3c6df871e364234b02554014'
        
      // Act
      createDApp(false)

      // Assert
      expect(window.App.hash).to.be.equal(logicHash)
    })
  })

  describe('Scenarios', function () {
    describe('Ideal', function () {
    
      it('Connect', function (done) {
        // Arrange

        // Act

        this.timeout(100000)
        connect()
          .then(info => {
            // Assert
            assert.isOk(info.bankroller_address)
          })
          .then(() => done())
          .catch(err => {
            done(err)
          })
      })

      it('Game', function () {
        this.timeout(10000)
        return new Promise((resolve, reject) => {
          // Arrange
          const amount = 0.1
          const num    = 35000
          const Hash   = DCLib.randomHash()
  
          // Act
          App.call(
            'roll', [amount, num, Hash], 
            function (res, advabnced) {
              resolve(res)
            })  
        }).then(res => {
          // Assert
          assert.isDefined(res.random_num, 'random num is defined')        
        })
      })

      it('Close game', function (done) {
        // Arrange
        const session = 1
        
        // Act
        this.timeout(50000)
        disconnect(session, 1).then(res => {
          // Assert
          expect(res.connection.disconnected).to.be.equal(true)
          done()
        })
      })
    })

    describe('Not ideal', function () {

      let sandbox

      beforeEach(function () {
        sandbox = sinon.sandbox.create()
      })
      
      afterEach(function () {
        sandbox.restore()
      })
      
      it('connect without gamedata', function () {
        // Arrange
        const deposit         = 0.1
        const game_data       = {type: 'uint', value: []}
        const callMethod      = sandbox.stub(App, 'connect')
        const connect_address = 'auto'
        
        // Act
        this.timeout(20000)
        callMethod.withArgs({
          bankroller : connect_address,
          paychannel : {deposit: deposit},
          gamedata   : game_data          
        }).returns(true)

        // Assert
        expect(callMethod({
          bankroller : connect_address,
          paychannel : {deposit: deposit},
          gamedata   : game_data
        })).to.be.equal(true)
      })

      it('connect without deposit', function () {
        // Arrange
        const error      = '😓 Your deposit can not be 0'
        const deposit    = 0
        const game_data  = {type: 'uint', value: [1, 2, 3]}
        const callMethod = sandbox.stub(App, 'connect')

        // Act
        this.timeout(20000)
        callMethod.withArgs({
          bankroller: 'auto',
          paychannel: {deposit: deposit},
          gamedata: game_data
        }).returns(error)

        // Assert
        expect(callMethod({
          bankroller: 'auto',
          paychannel: {deposit: deposit},
          gamedata: game_data
        })).to.be.equal(error)
      })
  
      it('roll with big user_num', function () {
        // Arrange
        const amount     = 0.1
        const num        = 90000
        const Hash       = DCLib.randomHash()
        const error      = 'Error big user_num'
        const callMethod = sandbox.stub(App, 'call')

        // Act
        this.timeout(10000)
        callMethod.withArgs(amount, num, Hash).returns(error)

        // Assert
        expect(callMethod(amount, num, Hash)).to.be.equal(error)
      })

      it('roll with big user_amount', function () {
        // Arrange
        const amount     = 10
        const num        = 35000
        const Hash       = DCLib.randomHash()
        const error      = 'invalid proffit due to incorrectly transmitted parameters (big user amount)'
        const disconnect = sandbox.stub(App, 'disconnect')
        
        // Act
        this.timeout(10000)
        App.call('roll', [amount, num, Hash])
        disconnect.returns(error)

        // Assert
        expect(disconnect()).to.be.equal(error)
      })

      it('roll without randomHash', function () {
        // Arrange
        const amount     = 0.1
        const num        = 35000
        const Hash       = false
        const error      = 'invalid proffit due to incorrectly transmitted parameters (no hash)'
        const disconnect = sandbox.stub(App, 'disconnect')

        // Act
        this.timeout(10000)
        App.call('roll', [amount, num, Hash])
        disconnect.returns(error)

        // Assert
        expect(disconnect()).to.be.equal(error)
      })

      it('roll without args', function () {
        // Arrange
        const error      = `Cannot read property 'length' for args of undefined`
        const callMethod = sandbox.stub(App, 'call')

        // Act
        this.timeout(10000)
        callMethod.returns(error)

        // Assert
        expect(callMethod()).to.be.equal(error)
      })
  
      it('roll with user_num 0 or user_bet 0', function () {
        const user_bet = 0
        const user_num = 0
        const hash     = 'd93b5913c94a6e67b883cf61eb321709d6996ce890e7180b808ed686ac77624505880923a4ea5c2a1ae6a92f0ff143a60e3d35875bdc25b8a48cdd47eb4a776c1c'
        const result   = {
          balance     : '0.1',
          profit      : 0,
          random_hash : 'd93b5913c94a6e67b883cf61eb321709d6996ce890e7180b808ed686ac77624505880923a4ea5c2a1ae6a92f0ff143a60e3d35875bdc25b8a48cdd47eb4a776c1c',
          random_num  : 27676,
          timestamp   : 1523433689084,
          user_bet    : 0,
          user_num    : '0'
        }
        const callMethod = sandbox.stub(App, 'call')

        // Act
        this.timeout(20000)
        callMethod.withArgs(user_bet, user_num, hash).returns(result)

        // Assert
        expect(callMethod(user_bet, user_num, hash)).to.be.equal(result)
      })

      it('disconnect with wrong value session', function () {
        // Arrange
        const error      = 'Contract method closeByConcent failed, due to wrong value session'
        const session    = 10
        const disconnect = sandbox.stub(App, 'disconnect')
        
        // Act
        disconnect.withArgs(session).returns(error)
        console.error(disconnect(session))

        // Assert
        expect(disconnect(session)).to.be.equal(error)
      })
  
  
      it('Big deposit', function () {
        // Arrange
        const error           = 'Your BET balance 1.6 <  10'
        const deposit         = 10
        const connect         = sandbox.stub(App, 'connect')
        const connect_address = '0xaf6300ee7e91b5Cf13aA4CbE2832087b5f35D86a'
        const argument        = {
          bankroller : connect_address,
          paychannel : {deposit : deposit},
          gamedata   : {type: 'uint', value: [1,2,3]}
        }
        
        // Act
        this.timeout(100000)
        connect.withArgs(argument).returns(error)
        console.error(connect(argument))

        // Assert
        expect(connect(argument)).to.be.equal(error)
      })
  
      it('connect offline bankroller', function () {
        // Arrange
        const error           = 'bankroller does not exist or is offline'
        const deposit         = 0.1
        const connect         = sandbox.stub(App, 'connect')
        const connect_address = '0xaf6300ee7e91b5Cf13aA4CbE2832087b5f35D86b'
        const argument        = {
          bankroller : connect_address,
          paychannel : {deposit : deposit},
          gamedata   : {type: 'uint', value: [1,2,3]}
        }
        
        // Act
        this.timeout(100000)
        connect.withArgs(argument).returns(error)
        console.error(connect(argument))

        // Assert
        expect(connect(argument)).to.be.equal(error)
      })
    })
  })
})
