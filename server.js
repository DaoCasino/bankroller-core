import fs    from 'fs'
import path  from 'path'
import DApps from 'dapps/dapps.js'

const rollbar_path = path.resolve('../../tools/rollbar/index.js')
if (fs.existsSync(rollbar_path)) {
  require(rollbar_path)
}

DApps.start()
