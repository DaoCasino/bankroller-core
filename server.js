// import fs    from 'fs'
// import path  from 'path'
import fetch from 'node-fetch'
import DApps from 'dapps/dapps.js'

global.fetch = fetch

console.log('')
console.log('')
console.log('-------------------------------')
console.log('BANKROLLER NODE START          ')
console.log('process.env.DC_NETWORK: ', process.env.DC_NETWORK)
console.log('-------------------------------')
console.log('')
console.log('')

// const rollbar_path = path.resolve('../../tools/rollbar/index.js')
// if (fs.existsSync(rollbar_path)) {
//   require(rollbar_path)()
// }

process.on('unhandledRejection', (reason, promise) => {
  console.log('')
  console.log('')
  console.log('----------------------------------')
  console.log('  unhandledRejection - restart    ')
  console.log('----------------------------------')
  console.log('')
  console.log(reason, promise)
  process.exit()
})

DApps.start()
