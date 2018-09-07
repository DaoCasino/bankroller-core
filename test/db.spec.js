const DB = require('../lib/DB').default

describe('Test DB Bankroller', () => {
  const data = {
    k : 'privateKey',
    v : '0xce99c14e2922f7400af7336dff3fc734a15e32330429f616802913d452070468'
  }

  test('Create DB key', async () => {
    (await DB.set(data.k, data.v))

    expect(await DB.get(data.k)).toBeDefined()
    expect(await DB.get(data.k)).toBe(data.v)
  })

  test('Get DB', async () => {
    const privateKey = await DB.get(data.k)

    expect(privateKey).toBeDefined()
    expect(privateKey).toBe(data.v)
  })

  test('Set DB key', async () => {
    (await DB.set(data.k, 'testdata'))

    expect(await DB.get(data.k)).toBeDefined()
    expect(await DB.get(data.k)).toBe('testdata')
  })
})
