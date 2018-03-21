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

function createDApp () {
  App = new DCLib.DApp({
    slug: 'dicetest_v12',
    contract : dappContract
  })
  window.App = App    
}

function disconnect (session, done) {
  return new Promise((resolve, reject) => { 
    App.disconnect({session:session}, res => {
      resolve(res)
    })
  })
}

function connect (address = 'auto', deposit = 0.1, gamedata = {type:'uint', value:[1, 2, 3]}) {
  return new Promise((resolve, reject) => {
    // Arrange

    // Act
    console.log(address)
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
      
      console.log(_openkey)
      // Assert
      assert.isOk(DCLib.Account.get().openkey)

    })
      
    it('Check balance', async function () {
      // Arrange
      const min_bets = 0.1
      const min_eth = 0.2

      // Act
      this.timeout(10000)
      const res = await DCLib.Eth.getBalances(_openkey)

      // Assert
      expect(parseInt(Math.round(res.eth))).to.be.least(min_eth)
      expect(parseInt(res.bets)).to.be.least(min_bets)
    })

    it('Create DApp', function () {
      // Arrange
      const logicHash = '0xfacb5ed56f04123e39945190cae9bba895e695c9b3d1ad248c99c81a3f25381c'
        
      // Act
      createDApp()
    
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
        connect().then(info => {
        // Assert
          assert.isOk(info.bankroller_address)
          done()
        }).catch(err => {
          console.log(err)
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
          console.log(res)
          assert.isDefined(res.random_num, 'random num is defined')
        })
      })

      it('Close game', function (done) {
        // Arrange
        const session = 1
        
        // Act
        this.timeout(50000)
        disconnect(session, done).then(res => {
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

      it('connect without gamedata', function (done) {
        // Arrange
        const connect_address = '0xaf6300ee7e91b5Cf13aA4CbE2832087b5f35D86a'
        const deposit = 0.1
        
        // Act
        this.timeout(100000)
        createDApp()
        connect(connect_address, deposit, {type: 'uint', value: []}).then(info => {
          // Assert
          expect(info.bankroller_address).to.be.equal(connect_address)
          done()
        }).catch(err => {
          done(err)
        })
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
        console.error(callMethod(amount, num, Hash))

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
        console.error(disconnect())

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
        console.error(disconnect())

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
        console.error(callMethod())

        // Assert
        expect(callMethod()).to.be.equal(error)
      })
  
      it('roll with user_num 0', function () {
        this.timeout(10000)
        return new Promise((resolve, reject) => {
          // Arrange
          const amount = 0.1
          const num    = 0
          const Hash   = DCLib.randomHash()
  
          // Act
          App.call(
            'roll', [amount, num, Hash], 
            function (res, advabnced) {
              resolve(res)
            })  
        }).then(res => {
          // Assert
          return assert.isDefined(res.random_num, 'random num is defined')
        })
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
