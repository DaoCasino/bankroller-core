import cryptico from "js-cryptico";

export default class RSA {
  RSAKey: any;
  private _publicExponent: string;
  constructor(publickExponent = "10001") {
    this.RSAKey = new cryptico.RSAKey();
    this._publicExponent = publickExponent;
  }

  parseBigInt(a, b) {
    return new cryptico.RSAKey().parseInt(a, b);
  }

  // Method for creation public RSA keys for verify (for Player)
  create(modulus, exponent = "10001") {
    const publicExponent = exponent || this._publicExponent;
    this.RSAKey.setPublic(modulus, publicExponent);
  }

  // Method for creation private RSA keys for sign (for Bankroller)
  generateRSAkey(long = 2048) {
    this.RSAKey.generate(long, this._publicExponent);
  }

  // Sign rawMsg
  signHash(message) {
    let msg = this.parseBigInt(message, 16);
    msg = msg.mod(this.RSAKey.n);
    return this.RSAKey.doPrivate(msg);
  }

  // Verification rawMsg and Signed msg
  verify(message, signedMessage) {
    let msg = this.parseBigInt(message, 16);
    let sigMsg = this.parseBigInt(signedMessage, 16);
    msg = msg.mod(this.RSAKey.n);
    let newMessage = this.RSAKey.doPublic(sigMsg);
    return newMessage.equals(msg);
  }
}
