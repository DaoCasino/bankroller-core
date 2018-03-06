import NeDB from 'nedb'
import path from 'path'
import * as Utils from './utils'

const dbfile = path.join(path.resolve(), '/data/DB/keyval.db')
// console.log('NeDB file:', dbfile)

const KeyVal = new NeDB({
  filename: dbfile,
  autoload: true
})

export default new class DB {
  get (key) {
    // console.log('DB:get', key)
    return new Promise((resolve, reject) => {
      KeyVal.findOne({ k: key }, (err, doc) => {
        // console.log('err:', err)
        // console.log('doc:', doc)
        if (err) Utils.debugLog(['Err', err], 'error')
        let value = null
        if (doc && doc.v) value = doc.v
        resolve( value )
      })
    })
  }

  set (key, val) {
    return new Promise(async (resolve, reject) => {
      const exist = await this.get(key)
      if (exist) {

        KeyVal.update({k:key}, {$set:{v:val}}, (err, doc) => {
          if (err) Utils.debugLog(['Err ', err], 'error')
          resolve(doc)
        })
        return
      }

      KeyVal.insert({k:key, v:val}, (err, doc) => {
        if (err) Utils.debugLog(['Err ', err], 'error')
        resolve(doc)
        return doc
      })
    })
  }
}()
