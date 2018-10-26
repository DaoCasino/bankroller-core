import Bankroller from "../dapps/Bankroller"
import { describe, it } from "mocha"
import { expect } from "chai"
import { config } from "dc-configs"
import fs from "fs"
import path from "path"
import { getSubDirectories } from "../dapps/FileUtils"
import { IpfsTransportProvider } from 'dc-messaging'


const randomString = () =>
  Math.random()
    .toString(36)
    .substring(2, 15) +
  Math.random()
    .toString(36)
    .substring(2, 15)

const EXAMPLE_GAME = 'FTE1'

const createFakeGame = name => {
  const DAppsPath = config.default.DAppsPath
  const openDir = path.join(DAppsPath, EXAMPLE_GAME)
  const files = fs.readdirSync(openDir).map(fileName => {
    return { fileName, fileData: fs.readFileSync(path.join(openDir, fileName)) }
  })

  return { name, files }
}

const startBankroller = async (bankroller) => {
  try {
    const bankrollerTransportProvider = await IpfsTransportProvider.create()
    await bankroller.start(bankrollerTransportProvider)
  } catch (error) {
    console.error(error)
    process.exitCode = 1
    process.kill(process.pid, 'SIGTERM')
  }
}

const suite = describe("Bankroller Tests", async () => {
  let bankroller
  const game = createFakeGame(randomString())

  let provider

  it('Start bankroller', async () => {
    provider = await IpfsTransportProvider.create()
    bankroller = await new Bankroller().start(provider)
  })

  it('Test upload game', async () => {
   const result = await bankroller.uploadGame(game)
  })

  it('Stop bankroller', async () => {
    await bankroller.stop()
    await provider.destroy()
  })



})
