#!/usr/bin/env bash

DC_NETWORK=local          \
DATA_PATH=data_local      \
DATA_SUBPATH=local        \
DAPPS_PATH=data/dapps     \
nodemon --watch ./ --exec babel-node ./server.js
