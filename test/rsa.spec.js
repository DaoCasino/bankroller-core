const RSA = require('../lib/rsa').default

let rsa_player     = false
let rsa_bankroller = false

beforeEach(() => {
  rsa_player     = new RSA()
  rsa_bankroller = new RSA()    
})

describe('Test RSA Bankroller', () => {
  const message = 'Test message for rsa'

  test('Parse Big Int', () => {
    const parse = rsa_player.parseBigInt(message, 16)

    expect(typeof parse).toBe('object')
    expect(parse.t > 0).toBe(true)
    expect(parse.toString(16)).toMatch(/^[a-zA-Z0-9]+$/)
  })

  test('Generate RSA key', () => {
    rsa_bankroller.generateRSAkey()

    const _N = rsa_bankroller.RSA.n
    const _E = rsa_bankroller.RSA.e
    const _D = rsa_bankroller.RSA.d

    expect(_N).not.toBe(null)
    expect(_N.t > 10).toBe(true)
    expect(_N.toString(16)).toMatch(/^[a-zA-Z0-9]+$/)
    
    expect(_D).not.toBe(null)
    expect(_D.t > 10).toBe(true)
    expect(_D.toString(16)).toMatch(/^[a-zA-Z0-9]+$/)

    expect(_E).not.toBe(0)
    expect(_E.toString(16)).toBe(rsa_bankroller.publicExponent)
  })

  test('Create RSA key', () => {
    rsa_bankroller.generateRSAkey()

    rsa_player.create(
      rsa_bankroller.RSA.n.toString(16),
      rsa_bankroller.RSA.e.toString(16)
    )

    const _N = rsa_player.RSA.n.toString(16)
    const _E = rsa_player.RSA.e.toString(16)

    expect(_N).not.toBe(null)
    expect(_N.length > 10).toBe(true)
    expect(_N).toMatch(/^[a-zA-Z0-9]+$/)

    expect(_E).not.toBe(0)
    expect(_E).toBe(rsa_player.publicExponent)
  })

  test('Sign message', () => {
    rsa_bankroller.generateRSAkey()
    const signed = rsa_bankroller.signHash(message).toString(16)

    expect(signed.length > 10).toBe(true)
    expect(signed).toMatch(/^[a-zA-Z0-9]+$/)
  })

  test('Verify message', () => {
    const message = 'Test message'
    
    rsa_bankroller.generateRSAkey()
    
    rsa_player.create(
      rsa_bankroller.RSA.n.toString(16),
      rsa_bankroller.RSA.e.toString(16)
    )

    const signed = rsa_bankroller.signHash(message).toString(16)
    const verify = rsa_player.verify(message, signed)
    
    expect(verify).toBe(true)
  })
})
