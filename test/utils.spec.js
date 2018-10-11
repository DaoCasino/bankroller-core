const _config = require("../config");
const Utils = require("utils");
const web3_utils = require("web3-utils");

describe("Test Utils bankroller", () => {
  const bets = 12;
  const num = 88887777666655554444;
  const randomHash = Utils.makeSeed();
  const buffer = [72, 101, 108, 108, 111, 33, 36];

  test("bet2dec", () => {
    const bet2dec = Utils.bet2dec(bets);

    expect(typeof bet2dec).toBe("number");
    expect(bet2dec).toBe(12000000000000000000);
  });

  test("dec2bet", () => {
    const dec2bet = Utils.dec2bet(12000000000000000000);

    expect(typeof dec2bet).toBe("number");
    expect(dec2bet).toBe(bets);
  });

  test("clearcode", () => {
    const text = "Hello  i  am  \nwrong \ttext";

    expect(typeof Utils.clearcode(text)).toBe("string");
    expect(Utils.clearcode(text)).toBe("Hello i am wrong text");
  });

  test("checksum", () => {
    const checksum = Utils.checksum("testing_slug");

    expect(typeof checksum).toBe("string");
    expect(checksum.substr(0, 2)).toBe("0x");
    expect(checksum).toMatch(/^[a-zA-Z0-9]+$/);
    expect(checksum).toBe(
      "0xd34128b373fda1504ae3e9358b6c4d20a115354bfd086ffa25772bb7c934fcde"
    );
  });

  test("toFixed", () => {
    expect(typeof Utils.toFixed(6.2336462437752, 1)).toBe("number");
    expect(Utils.toFixed(6.2336462437752, 1)).toBe(6.3);
    expect(Utils.toFixed(6.2336462437752, 2)).toBe(6.24);
    expect(Utils.toFixed(6.2336462437752, 3)).toBe(6.234);
  });

  test("numToHex", () => {
    expect(typeof Utils.numToHex(num)).toBe("string");
    expect(Utils.numToHex(num)).toMatch(/^[a-zA-Z0-9]+$/);
    expect(Utils.numToHex(num)).toBe("4d190d2d716e78000");
  });

  test("hexToNum", () => {
    expect(typeof Utils.hexToNum("4d190d2d716e78000")).toBe("number");
    expect(Utils.hexToNum("4d190d2d716e78000")).toBe(num);
  });

  test("hextoString", () => {
    expect(typeof Utils.hexToString(web3_utils.utf8ToHex("Hello hex"))).toBe(
      "string"
    );
    expect(
      Utils.hexToString(web3_utils.utf8ToHex("Hello hex")).indexOf(
        "Hello hex"
      ) !== -1
    ).toBe(true);
  });

  test("pad", () => {
    expect(typeof Utils.pad(2, 5)).toBe("string");
    expect(Utils.pad(2, 5)).toBe("00002");
  });

  test("pad: Invalid arg", () => {
    expect(typeof Utils.pad("test", "testnum")).toBe("string");
    expect(Utils.pad("test", "testnum")).toBe("test");
  });

  test("Buff to hex", () => {
    const buf2hex = Utils.buf2hex(buffer);

    expect(typeof buf2hex).toBe("string");
    expect(buf2hex).toMatch(/^[a-zA-Z0-9]+$/);
    expect(buf2hex).toBe("48656c6c6f2124");
  });

  test("Buff to hex: invalid arg or empty array", () => {
    expect(Utils.buf2hex([])).toBe("");
    expect(Utils.buf2hex({})).toBe("");
    expect(Utils.buf2hex(null)).toBe("");
    expect(Utils.buf2hex("sdasdas")).toBe("");
  });

  test("Buff to bytes 32", () => {
    const buf2hex = Utils.buf2hex(buffer);
    const buf2bytes32 = Utils.buf2bytes32(buffer);

    expect(typeof buf2bytes32).toBe("string");
    expect(buf2bytes32).toMatch(/^[a-zA-Z0-9]+$/);
    expect(buf2bytes32.slice(2)).toBe(buf2hex);
    expect(buf2bytes32.substr(0, 2)).toBe("0x");
  });

  test("Buff to bytes 32: invalid args or empty array", () => {
    expect(Utils.buf2bytes32([])).toBe("0x");
    expect(Utils.buf2bytes32({})).toBe("0x");
    expect(Utils.buf2bytes32(null)).toBe("0x");
    expect(Utils.buf2bytes32("sdasdas")).toBe("0x");
  });

  test("Remove 0x", () => {
    const remove0x = Utils.remove0x(randomHash);

    expect(remove0x).toMatch(/^[a-zA-Z0-9]+$/);
    expect(remove0x).toBe(randomHash.slice(2));
  });

  test("Remove 0x: invalid arg", () => {
    try {
      Utils.remove0x(23421);
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }
  });

  test("Add 0x", () => {
    const add0x = Utils.add0x(randomHash.slice(2));

    expect(add0x).toMatch(/^[a-zA-Z0-9]+$/);
    expect(add0x.substr(0, 2)).toBe("0x");
    expect(add0x).toBe(randomHash);
  });

  test("Add 0x: invalid arg", () => {
    try {
      Utils.add0x(23421);
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }
  });

  test("Make seed", () => {
    const seed = Utils.makeSeed();
    expect(typeof seed).toBe("string");
    expect(seed.length).toBe(randomHash.length);
    expect(seed.slice(2)).not.toBe(randomHash.slice(2));
    expect(seed.substr(0, 2)).toBe("0x");
  });

  test("Sha3", () => {
    const check = [
      randomHash,
      33334,
      "Hello DAO",
      {},
      { t: "uint", v: [1, 2, 3] }
    ];

    for (let item of check) {
      const sha3 = Utils.sha3(item);

      expect(typeof sha3).toBe("string");
      expect(sha3).toMatch(/^[a-zA-Z0-9]+$/);
      expect(sha3.substr(0, 2)).toBe("0x");
      expect(sha3).not.toBe(randomHash);
    }
  });

  test("Sha3: Array value", () => {
    try {
      Utils.sha3([3, 1, 2]);
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }
  });

  test("Debug log", () => {
    expect(Utils.debugLog("a", _config.loglevel)).toBeUndefined();
    expect(Utils.debugLog(1, _config.loglevel)).toBeUndefined();
    expect(Utils.debugLog(["a", 1, {}, []], _config.loglevel)).toBeUndefined();
    expect(Utils.debugLog({}, _config.loglevel)).toBeUndefined();
    expect(Utils.debugLog(null, _config.loglevel)).toBeUndefined();
    expect(Utils.debugLog(undefined, _config.loglevel)).toBeUndefined();
  });

  test("Local Game Contract", async done => {
    done();
  });

  test("Concat Uint8Array", () => {
    const buffer_one = new Uint8Array(100);
    const buffer_two = new Uint8Array(100);

    const concatBuffer = Utils.concatUint8Array(buffer_one, buffer_two);

    expect(typeof concatBuffer).toBe("object");
    expect(concatBuffer).toHaveProperty("byteLength");
    expect(concatBuffer.byteLength).toBe(buffer_one.length + buffer_two.length);
  });

  test("Concat Uint8Array with not num and array arguments", () => {
    const buffer_one = {};
    const buffer_two = "";

    const concatBuffer = Utils.concatUint8Array(buffer_one, buffer_two);

    expect(typeof concatBuffer).toBe("object");
    expect(concatBuffer).toHaveProperty("byteLength");
    expect(concatBuffer.byteLength).toBe(0);
  });

  test("Concat Uint8Array with large length arguments", async () => {
    const buffer_one = 1111;
    const buffer_two = 303;

    try {
      await Utils.concatUint8Array(buffer_one, buffer_two);
    } catch (err) {
      expect(err.name).toBe("RangeError");
      expect(err.message).toBe("Source is too large");
    }
  });

  test("Catch Error", async () => {
    const prom = new Promise((resolve, reject) => {
      throw new Error("Custom error");
    });

    const error = await Utils.catchErr(prom);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Custom error");
  });

  test("Catch Error:NOERROR", async () => {
    const prom = new Promise(resolve => {
      resolve(true);
    });

    try {
      const result = await Utils.catchErr(prom);
      expect(result).toEqual([null, true]);
    } catch (err) {
      expect(err).toEqual({ error: "Custom error" });
    }
  });
});
