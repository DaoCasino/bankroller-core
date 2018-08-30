const Eth          = require('../lib/Eth').default
const Utils        = require('../lib/utils')
const ERC20Address = require('../protocol/addresses').ERC20

describe('Test Eth module bankroller', () => {
  test('Constructor default params', () => {
    expect(typeof Eth.cache).toBe('object')
    expect(Eth.cache).toEqual({})

    expect(typeof Eth.web3).toBe('object')
    expect(Eth.web3).toHaveProperty('eth')
    expect(Eth.web3).toHaveProperty('version')
    expect(Eth.web3.version).toBe(require('../package.json').dependencies.web3)

    expect(typeof Eth.ERC20).toBe('object')
    expect(Eth.ERC20).toHaveProperty('methods')
    expect(Eth.ERC20).toHaveProperty('options')
  })

  test('Init Account', () => {

  })

  test('Get Account from server', () => {

  })

  test('Get Eth balance', () => {

  })

  test('Get Bet balance', () => {

  })

  test('Get All balance', () => {

  })
})
