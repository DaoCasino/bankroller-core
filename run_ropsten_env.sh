#!/usr/bin/env bash

DC_NETWORK=ropsten            \
DATA_PATH=data_ropsten        \
DATA_SUBPATH=r                \
DAPPS_PATH=data/dapps         \
nodemon --watch ./ --exec babel-node ./server.js
