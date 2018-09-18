const path = require("path");

let faucet_server = {};
let network;
if (process.env.DC_NETWORK === "sdk") {
  network = require("./configs/sdk/config.js");
} else if (process.env.DC_NETWORK === "local") {
  network = require("./configs/local/config.js");
} else {
  network = require("./configs/ropsten/config.js");
}

let data_path = process.env.DATA_PATH || "./data";

module.exports = {
  privateKey: process.env.privateKey || false,
  wallet_pass: "1234",
  loglevel: "light",
  faucetServerUrl: "https://faucet.dao.casino/",
  dapps_dir: path.join(
    path.resolve(),
    process.env.DAPPS_PATH || data_path + "/dapps/"
  ),
  network: network
};
