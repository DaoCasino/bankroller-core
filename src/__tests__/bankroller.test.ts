import Bankroller from "../dapps/Bankroller"
import { describe, it } from "mocha"
import { expect } from "chai"
import { config } from "dc-configs"
import fs from "fs"
import path from "path"
import { TransportProviderFactory, ITransportProviderFactory, TransportType } from "dc-messaging"
import { Logger } from "dc-logging"
import { GameUpload, GameInstanceInfo } from "../intefaces/IBankroller"

const log = new Logger("Bankroller test")

// TODO: create expect checks

const randomString = () =>
  Math.random()
    .toString(36)
    .substring(2, 15) +
  Math.random()
    .toString(36)
    .substring(2, 15)

const EXAMPLE_GAME_PATH = "FTE1"
const EXAMPLE_GAME_NAME = "DCGame_FTE_v1"

const createFakeGame = (name: string): GameUpload => {
  const DAppsPath = config.default.DAppsPath
  const openDir = path.join(DAppsPath, EXAMPLE_GAME_PATH)
  const files = fs.readdirSync(openDir).map(fileName => {
    const filePath = path.join(openDir, fileName)
    const { size } = fs.statSync(filePath)
    return { fileName, fileData: fs.readFileSync(filePath), fileSize: size }
  })

  return { name, files }
}

const checkSize = (game: GameUpload): void => {
  const DAppsPath = config.default.DAppsPath
  const uploadedDir = path.join(DAppsPath, game.name) // directory game uploaded

  /* tslint:disable-next-line */
  expect(fs.existsSync(uploadedDir)).to.be.true

  fs.readdirSync(uploadedDir).map(fileName => {
    const filePath = path.join(uploadedDir, fileName)
    const { size } = fs.statSync(filePath)
    const { fileSize } = game.files.find(file => file.fileName === fileName)
    expect(size).to.be.equal(fileSize)
  })
}

const bankrollerTest = (name, provider) => describe(name, async () => {
  let bankroller
  let game

  it("Start bankroller", async () => {
    bankroller = await new Bankroller().start(provider)
    /* tslint:disable-next-line */
    expect(bankroller.isStarted()).to.be.true
  })

  it("Upload game", async () => {
    game = createFakeGame(randomString())
    const result = await bankroller.uploadGame(game)
    expect(result.status).to.equal(Bankroller.STATUS_SUCCESS)
    checkSize(game)
  })

  it('Get games list', () => {
    const list:{ name: string }[] = bankroller.getGames()
    /* tslint:disable-next-line */
    expect(list.length !== 0).to.be.true
    /* tslint:disable-next-line */
    expect(list.findIndex(item => item.name === EXAMPLE_GAME_NAME) !== -1).to.be.true
  })

  it("Get game instances", () => {
    const instances: GameInstanceInfo[] = bankroller.getGameInstances(EXAMPLE_GAME_NAME)
    expect(instances).to.be.a('array')
  })

  it("Success reload game", async () => {
    const reloadGame = { ...game, reload: true }
    const result = await bankroller.uploadGame(reloadGame)
    expect(result.status).to.equal(Bankroller.STATUS_SUCCESS)
    checkSize(reloadGame)
  })

  it("Error reload game", async () => {
    let error
    try {
      await bankroller.uploadGame(game)
    } catch (e) {
      error = e
    }

    expect(error).to.be.an.instanceof(Error)
  })

  it("Unload game", async () => {
    const result = await bankroller.unloadGame(game.name)
    expect(result.status).to.equal(Bankroller.STATUS_SUCCESS)

    const DAppsPath = config.default.DAppsPath
    const uploadedDir = path.join(DAppsPath, game.name)
    /* tslint:disable-next-line */
    expect(fs.existsSync(uploadedDir)).to.be.false
  })

  it("Stop bankroller", async () => {
    await bankroller.stop()
    /* tslint:disable-next-line */
    expect(bankroller.isStarted()).to.be.false
    await provider.destroy()
  })
})

describe('Bankroller providers', () => {
  it('IPFS', async () => {
    const factory = new TransportProviderFactory(TransportType.IPFS)
    const provider = await factory.create()

    bankrollerTest('Bankroller -> IPFS', provider)
  })

  it('WebSockets', async () => {
    const factory = new TransportProviderFactory(TransportType.WS)
    const provider = await factory.create()

    bankrollerTest('Bankroller -> WebSocket', provider)
  })
})
