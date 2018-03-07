import fs    from 'fs'
import path  from 'path'
import DApps from 'dapps/dapps.js'

console.log('')
console.log('')
console.log('-------------------------------')
console.log('BANKROLLER NODE START')
console.log('process.env.DC_NETWORK: ', process.env.DC_NETWORK)
console.log('-------------------------------')
console.log('')
console.log('')

const rollbar_path = path.resolve('../../tools/rollbar/index.js')
if (fs.existsSync(rollbar_path)) {
  require(rollbar_path)()
}

DApps.start()
