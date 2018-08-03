#!/usr/bin/env bash

DC_NETWORK=sdk            \
DATA_PATH=data_sdk        \
DATA_SUBPATH=sdk          \
DAPPS_PATH=data_sdk/dapps \
nodemon --watch ./ --exec babel-node ./server.js
