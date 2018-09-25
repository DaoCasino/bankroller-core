import fs from "fs";
import path from "path";
import rimraf from "rimraf";
import { PayChannelLogic } from "dc-core";

const MANIFEST_FILENAME = "dapp.manifest";

export const checkFileExists = (
  fileName: string,
  maybeExtension: string[]
): string | null => {
  for (let i = 0; i < maybeExtension.length; i++) {
    const path = `${fileName}${maybeExtension[i]}`;
    if (fs.existsSync(path)) {
      return path;
    }
  }
  return null;
};

export const getSubDirectoriee = (directoryPath: string): string[] => {
  return fs
    .readdirSync(directoryPath)
    .map(subDir => path.join(directoryPath, subDir));
};

export const removeDir = (directoryPath: string): void => {
  rimraf.sync(directoryPath);
};

export const saveFilesToNewDir = (
  directoryPath: string,
  files: { fileName: string; fileData: Buffer | string }[]
) => {
  fs.mkdirSync(directoryPath);
  try {
    files.forEach(file => {
      fs.writeFileSync(path.join(directoryPath, file.fileName), file.fileData);
    });
  } catch (error) {
    fs.rmdirSync(directoryPath);
  }
};

export const loadLogic = (
  directoryPath: string
): { manifest: any; logic: (payChannel: PayChannelLogic) => void } => {
  let manifestPath: string = `${directoryPath}/${MANIFEST_FILENAME}`;
  const manifestFoundPath = checkFileExists(manifestPath, [".js", "", ".json"]);
  if (!manifestFoundPath) {
    throw new Error(`Manifest file not found ${manifestPath}`);
  }
  const manifest = manifestFoundPath.endsWith(".js")
    ? require(manifestFoundPath)
    : JSON.parse(fs.readFileSync(manifestFoundPath).toString());

  if (
    typeof manifest !== "object" ||
    manifest.disable ||
    manifest.disabled ||
    manifest.enable === false
  ) {
    return { manifest, logic: null };
  }
  let logicPath: string = path.join(directoryPath, manifest.logic);
  const logicFoundPath = checkFileExists(logicPath, [".js", "", ".json"]);
  if (!logicFoundPath) {
    throw new Error(`Manifest file not found ${logicFoundPath}`);
  }
  require(logicFoundPath);
  const logic = global["DAppsLogic"][manifest.slug];
  if (!logic) {
    throw new Error(`Error loading logic from directory ${directoryPath}`);
  }
  return { manifest: { ...manifest }, logic };
};
