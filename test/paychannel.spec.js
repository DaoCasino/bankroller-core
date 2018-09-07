const Paychannel = require('../lib/dapps/PayChannel').default
const Utils      = require('../lib/utils')

let pc = false
beforeEach(() => {
  pc = new Paychannel()
})

describe('Test PayChannel Bankroller', () => {
  test('Init paychannel value', () => {
    expect(pc.deposit.player).toBe(null)
    expect(pc.deposit.bankroller).toBe(null)
    expect(pc.balance.player).toBe(0)
    expect(pc.balance.bankroller).toBe(0)
    expect(pc._profit).toBe(0)
    expect(Array.isArray(pc._history)).toBe(true)
    expect(pc._history.length).toBe(0)
  })

  test('Set Deposit', () => {
    pc._setDeposits(1, 2)

    expect(pc.deposit.player).toBe(1)
    expect(pc.deposit.bankroller).toBe(2)
    expect(pc.balance.player).toBe(1)
    expect(pc.balance.bankroller).toBe(2)
  })

  test('Set Deposit: With invalid args', () => {
    pc._setDeposits('hi', 2)
    
    expect(isNaN(pc.balance.player)).toBe(true)
    expect(isNaN(pc.deposit.player)).toBe(true)
  })

  test('Get balance', () => {
    const paychannel_balance = pc._getBalance()

    expect(paychannel_balance).toHaveProperty('player')
    expect(paychannel_balance).toHaveProperty('bankroller')
    expect(typeof paychannel_balance.player).toBe('number')
    expect(typeof paychannel_balance.bankroller).toBe('number')
    expect(paychannel_balance.player).toBe(pc.balance.player)
    expect(paychannel_balance.bankroller).toBe(pc.balance.bankroller)
  })

  test('Get proffit', () => {
    const profit = pc._getProfit()

    expect(typeof profit).toBe('number')
    expect(profit).toBe(pc._profit)
  })

  test('Get Deposit', () => {
    pc._setDeposits(
      Utils.bet2dec(1),
      Utils.bet2dec(2)
    )
    
    const deposit = pc.getDeposit()

    expect(typeof deposit).toBe('number')
    expect(deposit).toBe(Utils.dec2bet(pc.deposit.player))
  })

  test('Get Deposit: With bets', () => {
    pc._setDeposits(1, 2)

    const deposit = pc.getDeposit()

    expect(typeof deposit).toBe('number')
    expect(deposit).toBe(1e-18)
  })

  test('Get Deposit: With default', () => {
    try {
      pc.getDeposit()
    } catch (err) {
      expect(err).toBeInstanceOf(TypeError)
    }
  })

  test('Get balance', () => {
    pc._setDeposits(
      Utils.bet2dec(1),
      Utils.bet2dec(2)
    )

    const balance = pc.getBalance()

    expect(typeof balance).toBe('number')
    expect(balance).toBe(1)
  })

  test('Get balance: With bet value', () => {
    pc._setDeposits(1, 2)
    
    const balance = pc.getBalance()

    expect(typeof balance).toBe('number')
    expect(balance).toBe(1e-18)
  })

  test('Get bankroller balance', () => {
    pc._setDeposits(
      Utils.bet2dec(1),
      Utils.bet2dec(2)
    )

    const bankroller_balance = pc.getBankrollBalance()

    expect(typeof bankroller_balance).toBe('number')
    expect(bankroller_balance).toBe(2)
  })

  test('Get balance: With bet value', () => {
    pc._setDeposits(1, 2)
    
    const bankroller_balance = pc.getBankrollBalance()

    expect(typeof bankroller_balance).toBe('number')
    expect(bankroller_balance).toBe(2e-18)
  })

  test('Get profit', () => {
    pc._profit = Utils.bet2dec(1)

    const profit = pc.getProfit()

    expect(typeof profit).toBe('number')
    expect(profit).toBe(1)
  })

  test('Get profit: With bet value', () => {
    pc._profit = 1

    const profit = pc.getProfit()

    expect(typeof profit).toBe('number')
    expect(profit).toBe(1e-18)
  })

  test('Update balance', () => {
    const profits = [1, 33, 8, 92, 22]

    for (let item of profits) {
      let reduceVal = pc._profit
      const check = Utils.dec2bet(reduceVal += Utils.bet2dec(item) * 1)

      pc.updateBalance(Utils.bet2dec(item))
      const profit = pc.getProfit()

      expect(typeof pc.balance.player).toBe('number')
      expect(typeof pc.balance.bankroller).toBe('number')
      expect(Utils.dec2bet(pc.balance.player)).toBe(check)
      expect(Utils.dec2bet(pc.balance.bankroller)).toBe(-check)
      expect(pc.balance.player).not.toBe(pc.balance.bankroller)

      expect(typeof profit).toBe('number')
      expect(profit).not.toBe(0)
      expect(profit).not.toBe(reduceVal)
      expect(profit).toBe(check)
    }
  })

  test('Update balance: With invalid arg', () => {
    const update = pc.updateBalance('hi')

    expect(isNaN(update)).toBe(true)
    expect(isNaN(pc.balance.player)).toBe(true)
    expect(isNaN(pc.balance.bankroller)).toBe(true)
  })

  test('addTX', () => {
    const profits = [1, 33, 8, 92, 22]

    for (let item of profits) {
      let reduceVal = pc._profit
      const check = Utils.dec2bet(reduceVal += Utils.bet2dec(item) * 1)

      pc.addTX(Utils.bet2dec(item))
      const profit = pc.getProfit()

      expect(typeof pc.balance.player).toBe('number')
      expect(typeof pc.balance.bankroller).toBe('number')
      expect(Utils.dec2bet(pc.balance.player)).toBe(check)
      expect(Utils.dec2bet(pc.balance.bankroller)).toBe(-check)
      expect(pc.balance.player).not.toBe(pc.balance.bankroller)

      expect(typeof profit).toBe('number')
      expect(profit).not.toBe(0)
      expect(profit).not.toBe(reduceVal)
      expect(profit).toBe(check)
    }
  })

  test('addTX: With invalid arg', () => {
    const update = pc.addTX('hi')

    expect(isNaN(update)).toBe(true)
    expect(isNaN(pc.balance.player)).toBe(true)
    expect(isNaN(pc.balance.bankroller)).toBe(true)
  })

  test('Print log', () => {
    pc._setDeposits(
      Utils.bet2dec(1),
      Utils.bet2dec(2)
    )
    
    pc.updateBalance(Utils.bet2dec(33))
    const printLog = pc.printLog()

    expect(printLog).toEqual(pc._history)
  })

  test('Print log: without game', () => {
    try {
      pc.printLog()
    } catch (err) {
      expect(err).toBeInstanceOf(TypeError)
    }
  })

  test('Reset', () => {
    pc._setDeposits(
      Utils.bet2dec(1),
      Utils.bet2dec(2)
    )
    
    pc.updateBalance(Utils.bet2dec(33))
    pc.reset()

    expect(pc.deposit.player).toBe(null)
    expect(pc.deposit.bankroller).toBe(null)
    
    expect(pc.balance.player).toBe(0)
    expect(pc.balance.bankroller).toBe(0)
    
    expect(pc._profit).toBe(0)
    
    expect(Array.isArray(pc._history)).toBe(true)
    expect(pc._history[pc._history.length - 1]).toHaveProperty('reset')
    expect(pc._history[pc._history.length - 1]).toHaveProperty('timestamp')
    expect(pc._history[pc._history.length - 1].reset).toBe(true)
  })
})
