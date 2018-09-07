import cryptico from "js-cryptico";

export default class RSA {
  _RSAKey: cryptico.RSAKey;
  private _publicExponent: string;
  constructor(publickExponent = "10001") {
    this._RSAKey = new cryptico.RSAKey();
    this._publicExponent = publickExponent;
  }

  parseBigInt(a, b) {
    return new cryptico.RSAKey().parseInt(a, b);
  }

  // Method for creation public RSA keys for verify (for Player)
  create(modulus, exponent = "10001") {
    const publicExponent = exponent || this.publicExponent;
    this.RSA.setPublic(modulus, publicExponent);
  }

  // Method for creation private RSA keys for sign (for Bankroller)
  generateRSAkey(long = 2048) {
    this._RSAKey.generate(long, this._publicExponent);
  }

  // Sign rawMsg
  signHash(message) {
    let msg = parseBigInt(message, 16);
    msg = msg.mod(this._RSAKey.n);
    return this._RSAKey.doPrivate(msg);
  }

  // Verification rawMsg and Signed msg
  verify(message, signedMessage) {
    let msg = this.parseBigInt(message, 16);
    let sigMsg = this.parseBigInt(signedMessage, 16);
    msg = msg.mod(this.RSA.n);
    let newMessage = this.RSA.doPublic(sigMsg);
    return newMessage.equals(msg);
  }
}
