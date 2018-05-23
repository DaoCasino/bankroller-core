import _config    from '../../config.js'
import fs         from 'fs'
import path       from 'path'
import DApp       from './DApp.js'
import Eth        from '../Eth'
import * as Utils from '../utils'

/*
 * Lib constructor
 */
class _DCLib {
  constructor () {
    this.Eth   = Eth
    this.web3  = Eth.web3
    this.acc   = Eth.acc
    this.Utils = Utils
    this.DApp  = DApp
  }

  /**
   * Define DApp logic constructor function
   * @param {string} dapp_slug         unique slug of your dapp
   * @param {function} logic_constructor constructor Dapp logic
   */
  defineDAppLogic (dapp_slug, logic_constructor) {
    global.DAppsLogic = global.DAppsLogic || {}
    global.DAppsLogic[dapp_slug] = logic_constructor
  }

  randomHash () { return this.acc.sign(Utils.makeSeed()).messageHash }

  numFromHash (random_hash, min = 0, max = 100) {
    if (min > max) { let c = min; min = max; max = c }
    if (min === max) return max

    if (random_hash.length > 3 && random_hash.substr(0, 2) === '0x') {
      random_hash = random_hash.substr(2)
    }

    max++
    return Utils.bigInt(random_hash, 16).divmod(max - min).remainder.value + min
  }

  sigRecover (raw_msg, signed_msg) {
    raw_msg = Utils.remove0x(raw_msg)
    return this.web3.eth.accounts.recover(raw_msg, signed_msg).toLowerCase()
  }

  sigHashRecover (raw_msg, signed_msg) {
    return this.web3.eth.accounts.recover(raw_msg, signed_msg).toLowerCase()
  }

  checkSig (raw_msg, signed_msg, need_address) {
    raw_msg = Utils.remove0x(raw_msg)
    return (need_address.toLowerCase() === this.web3.eth.accounts.recover(raw_msg, signed_msg).toLowerCase())
  }
  checkHashSig (raw_msg, signed_msg, need_address) {
    return (need_address.toLowerCase() === this.web3.eth.accounts.recover(raw_msg, signed_msg).toLowerCase())
  }
}



export default new class DAppsAPIInit {
  constructor () {
    this.List = {}
    global.DCLib = new _DCLib()
  }

  start () {
    Eth.initAccount(acc => {
      Utils.debugLog(['Account initied ', acc], _config.loglevel)
      this.loadAll()
    })
  }

  loadAll () {
    fs.readdirSync( _config.dapps_dir ).forEach(key => this.loadDApp(key))
  }

  loadDApp (key) {
    const readManifest = function (file_path) {
      const tryReadFile = (path) => {
        try {
          let dapp_config = JSON.parse(fs.readFileSync(path))
          return dapp_config
        } catch (e) {
          return false
        }
      }
      return tryReadFile(file_path) || tryReadFile(file_path + '.json')
    }


    const d_path  = path.join(_config.dapps_dir, key)
    const m_path  = d_path + '/dapp.manifest'
    const d_conf  = readManifest(m_path)

    if (d_conf.disable || d_conf.disabled || d_conf.enable===false) return 
      
    const d_run   = path.join(d_path, d_conf.run)
    const d_logic = path.join(d_path, d_conf.logic)

    require(d_logic)
    require(d_run)

    Utils.debugLog('', _config.loglevel)
    Utils.debugLog('', _config.loglevel)
    Utils.debugLog(['Load Dapp ', key], _config.loglevel)
    Utils.debugLog(d_conf, _config.loglevel)
    Utils.debugLog('', _config.loglevel)

  }

}()
