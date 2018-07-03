import web3_utils from 'web3-utils'
import XHR        from 'xmlhttprequest'
import debug      from 'debug'

const web3_sha3 = web3_utils.soliditySha3

export const debugLog = function (data, loglevel, enable = true) {
  let log = debug('')

  if (loglevel === 'hight') log.enabled = true

  loglevel === 'light' && !enable
    ? log.enabled = false
    : log.enabled = true

  if (loglevel === 'error') {
    log = debug(loglevel)
    log.enabled = true
  }

  if (loglevel === 'none')  log.enabled = false

  if (Array.isArray(data)) return log(...data)

  return log(data)
}
export const LocalGameContract = (url) => {
  const xhr = new XHR.XMLHttpRequest()
  xhr.open('GET', url, false)
  xhr.send()

  if (xhr.status === 200) {
    return JSON.parse(xhr.responseText)
  } else {
    throw new Error('Bad JSON response')
  }
}

export const sha3 = web3_sha3

export const dec2bet = function (val, r = 2) {
  return web3_utils.fromWei(val + '')
}

export const bet2dec = function (val) {
  let b = web3_utils.toWei(val + '')
  // let b = '' + (val * 100000000)
  if (b.indexOf('.') > -1) {
    b = b.split('.')[0] * 1
  }
  return b * 1
}

export const clearcode = function (string) {
  return string.toString()
    .split('\t').join('')
    .split('\n').join('')
    .split('  ').join(' ')
}
export const checksum = function (string) {
  return sha3(clearcode(string))
}

export const toFixed = (value, precision) => {
  precision = Math.pow(10, precision)
  return Math.ceil(value * precision) / precision
}

export const numToHex = (num) => {
  return num.toString(16)
}

export const hexToNum = (str) => {
  return parseInt(str, 16)
}

export const hexToString = (hex) => {
  let str = ''
  for (let i = 0; i < hex.length; i += 2) { str += String.fromCharCode(parseInt(hex.substr(i, 2), 16)) }
  return str
}

export const pad = (num, size) => {
  let s = num + ''
  while (s.length < size) s = '0' + s
  return s
}

export const reverseForIn = (obj, f) => {
  let arr = []
  for (let key in obj) {
    arr.push(key)
  }
  for (let i = arr.length - 1; i >= 0; i--) {
    f.call(obj, arr[i])
  }
}

export const buf2hex = buffer => {
  return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('')
}
export const buf2bytes32 = buffer => {
  return '0x' + buf2hex(buffer)
}

export const remove0x = (str) => {
  if (str.length > 2 && str.substr(0, 2) === '0x') {
    // debugLog(['0x prefix removed from  ', str.substr(0, 8) + '...'], _config.loglevel)
    str = str.substr(2)
  }
  return str
}

export const add0x = (str) => {
  if (str.substr(0, 2) !== '0x') {
    // debugLog(['0x prefix added to ', str.substr(0, 8) + '...'], _config.loglevel)
    str = '0x' + str
  }
  return str
}

export const makeSeed = () => {
  var str = '0x'
  var possible = 'abcdef0123456789'

  for (var i = 0; i < 64; i++) {
    if (new Date().getTime() % 2 === 0) {
      str += possible.charAt(Math.floor(Math.random() * possible.length))
    } else {
      str += possible.charAt(Math.floor(Math.random() * (possible.length - 1)))
    }
  }

  return web3_sha3(numToHex(str))
}

export const concatUint8Array = function (buffer1, buffer2) {
  var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength)
  tmp.set(new Uint8Array(buffer1), 0)
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength)
  return tmp.buffer
}


export function catchErr (promise) {
  return promise.then(data => [null, data])
    .catch(err => [err])
}
