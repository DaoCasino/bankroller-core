import NeDB from "nedb";
import path from "path";
import * as Utils from "./utils";

const dbfile = path.join(
  path.resolve(),
  `/${process.env.DATA_PATH || "/data/"}/DB/${process.env.DATA_SUBPATH ||
    "/d1/"}/${process.env.DC_NETWORK || "local"}.db`
);

class DB {
  private _keyValueDB;
  constructor() {
    this._keyValueDB = new NeDB({
      filename: dbfile,
      autoload: true
    });
  }
  get(key: string): Promise<string> {
    // console.log('DB:get', key)
    return new Promise((resolve, reject) => {
      this._keyValueDB.findOne({ k: key }, (err, doc) => {
        // console.log('err:', err)
        // console.log('doc:', doc)
        if (err) Utils.debugLog(["Err", err], "error");
        let value = null;
        if (doc && doc.v) value = doc.v;
        resolve(value);
      });
    });
  }

  set(key: string, val: string) {
    return new Promise(async (resolve, reject) => {
      const exist = await this.get(key);
      if (exist) {
        this._keyValueDB.update(
          { k: key },
          { $set: { v: val } },
          (err, doc) => {
            if (err) Utils.debugLog(["Err ", err], "error");
            resolve(doc);
          }
        );
        return;
      }

      this._keyValueDB.insert({ k: key, v: val }, (err, doc) => {
        if (err) Utils.debugLog(["Err ", err], "error");
        resolve(doc);
        return doc;
      });
    });
  }
}

export default new DB();
