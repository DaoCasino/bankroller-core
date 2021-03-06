import Bankroller from "../dapps/Bankroller"
import { describe, it } from "mocha"
import { expect } from "chai"
import { config } from "@daocasino/dc-configs"
import fs from "fs"
import path from "path"
import { TransportProviderFactory, ITransportProviderFactory, TransportType, IMessagingProvider } from "@daocasino/dc-messaging"
import { Logger } from "@daocasino/dc-logging"
import { GameUpload, GameInstanceInfo, IBankroller } from "../intefaces/IBankroller"

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
    return { fileName, fileData: fs.readFileSync(filePath).toString('base64'), fileSize: size }
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

const bankrollerTest = (type:TransportType) => describe(`Transport layer ${TransportType[type]}`, () => {
  let provider
  let bankroller
  let game

  it(`Start bankroller`, async () => {
    const factory = new TransportProviderFactory(type)
    provider = await factory.create()
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
    const list:{ name: string, path: string }[] = bankroller.getGames()
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

const bankrollerRemoteTest = (type: TransportType) => {
  let provider: IMessagingProvider
  let remoteProvider: IMessagingProvider
  let bankroller: IBankroller
  let remoteBankroller: IBankroller
  let game

  it(`Start bankroller`, async () => {
    const factory = new TransportProviderFactory(type)
    provider = await factory.create()
    bankroller = await new Bankroller().start(provider)
    /* tslint:disable-next-line */
    expect(bankroller.isStarted()).to.be.true
  })

  it(`Get remote interface`, async () => {
    const factory = new TransportProviderFactory(type)
    remoteProvider = await factory.create()
    remoteBankroller = await remoteProvider.getRemoteInterface<IBankroller>(bankroller.getApiRoomAddress())
    /* tslint:disable-next-line */
    expect(await remoteBankroller.isStarted()).to.be.true
  })

  it('Remote upload game', async () => {
    game = createFakeGame(randomString())
    const result = await remoteBankroller.uploadGame(game)
    expect(result.status).to.equal(Bankroller.STATUS_SUCCESS)
    checkSize(game)
  })

  it("Unload game", async () => {
    const result = await remoteBankroller.unloadGame(game.name)
    expect(result.status).to.equal(Bankroller.STATUS_SUCCESS)

    const DAppsPath = config.default.DAppsPath
    const uploadedDir = path.join(DAppsPath, game.name)
    /* tslint:disable-next-line */
    expect(fs.existsSync(uploadedDir)).to.be.false
  })

  it(`Stop remote interface`, async () => {
    await remoteProvider.destroy()
  })

  it("Stop bankroller", async () => {
    await bankroller.stop()
    /* tslint:disable-next-line */
    expect(bankroller.isStarted()).to.be.false
    await provider.destroy()
  })
}

describe('Bankroller test', () => {
  if(Object.values(TransportType).includes(process.env.DC_TRANSPORT)) {
    bankrollerTest(TransportType[process.env.DC_TRANSPORT])
  }
  else {
    Object.values(TransportType).forEach(key => {
        if(typeof key === 'number') {
            bankrollerTest(key)
        }
    })
  }
})
