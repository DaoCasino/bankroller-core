import fs from "fs"
import path from "path"
import rimraf from "rimraf"
import { IGameLogic } from "@daocasino/dc-core"

const MANIFEST_FILENAME = "dapp.manifest"

export const checkFileExists = (
  fileName: string,
  maybeExtension: string[]
): string | null => {
  for (let i = 0; i < maybeExtension.length; i++) {
    const pathToFile = `${fileName}${maybeExtension[i]}`
    if (fs.existsSync(pathToFile)) {
      return pathToFile
    }
  }
  return null
}

export const getSubDirectories = (directoryPath: string): string[] => {
  return fs
    .readdirSync(directoryPath)
    .map(subDir => path.join(directoryPath, subDir))
    .filter(subDir => fs.lstatSync(subDir).isDirectory() && subDir)
}

export const removeDir = (directoryPath: string): void => {
  rimraf.sync(directoryPath)
}

export const saveFilesToNewDir = (
  directoryPath: string,
  files: { fileName: string; fileData: string }[]
): boolean => {
  let result: boolean = true
  fs.mkdirSync(directoryPath)
  try {
    files.forEach(file => {
      fs.writeFileSync(path.join(directoryPath, file.fileName), Buffer.from(file.fileData, 'base64'), 'utf-8')
    })
  } catch (error) {
    fs.rmdirSync(directoryPath)
    result = false
  }
  return result
}

export const loadLogic = async (
  directoryPath: string
): Promise<{
  manifest: any
  gameLogicFunction: () => IGameLogic
}> => {
  const manifestPath: string = `${directoryPath}/${MANIFEST_FILENAME}`
  const manifestFoundPath = checkFileExists(manifestPath, [".js", "", ".json"])
  if (!manifestFoundPath) {
    throw new Error(`Manifest file not found ${manifestPath}`)
  }
  const manifest = manifestFoundPath.endsWith(".js")
    ? require(manifestFoundPath)
    : JSON.parse(fs.readFileSync(manifestFoundPath).toString())

  if (
    typeof manifest !== "object" ||
    manifest.disable ||
    manifest.disabled ||
    manifest.enable === false
  ) {
    return { manifest, gameLogicFunction: null }
  }
  const logicPath: string = path.join(directoryPath, manifest.logic)
  const logicFoundPath = checkFileExists(logicPath, [
    ".js",
    ".mjs",
    "",
    ".json"
  ])
  if (!logicFoundPath) {
    throw new Error(`Manifest file not found ${logicFoundPath}`)
  }

  const gameLogicFunction = require(logicFoundPath)
  if (!gameLogicFunction) {
    throw new Error(`Error loading logic from directory ${directoryPath}`)
  }
  return { manifest: { ...manifest }, gameLogicFunction }
}
