import cryptico   from 'js-cryptico'

const parseBigInt = (a, b) => {
  return new cryptico.RSAKey().parseInt(a, b)
}

export default class RSA {
  _RSAKey: cryptico.RSAKey;
  private _publicExponent: string;
  constructor (publickExponent = '10001') {
    this._RSAKey = new cryptico.RSAKey()
    this._publicExponent = publickExponent
  }

  // Method for creation private RSA keys for sign (for Bankroller)
  generateRSAkey (long = 2048) {
    this._RSAKey.generate(long, this._publicExponent)
  }

  // Sign rawMsg
  signHash (message) {
    let msg = parseBigInt(message, 16)
    msg = msg.mod(this._RSAKey.n)
    return this._RSAKey.doPrivate(msg)
  }
}
