#!/usr/bin/env bash

DC_NETWORK=local          \
DATA_PATH=data            \
DATA_SUBPATH=local        \
DAPPS_PATH=data_sdk/dapps \
WATH_PATH=./              \
nodemon --watch ./ --exec babel-node ./server.js
