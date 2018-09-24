#!/usr/bin/env bash

# rpc_url=http://localhost:1406/ \
# privateKey=0x8d5366123cb560bb606379f90a0bfd4769eecc0557f1b362dcae9012b548b1e5 \
DC_NETWORK=sdk            \
DATA_PATH=data_sdk        \
DATA_SUBPATH=sdk          \
DAPPS_PATH=data_sdk/dapps \
nodemon --watch ./data_sdk/dapps/ --exec babel-node ./server.js
