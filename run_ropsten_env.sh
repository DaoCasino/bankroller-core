#!/usr/bin/env bash

DC_NETWORK=ropsten            \
DATA_PATH=data_ropsten        \
DATA_SUBPATH=r                \
DAPPS_PATH=data/dapps \
PRIVATE_KEY=0x45D090A0CA46A6BD3DF07923FBEB6631B1C257112E0047C2140B0D2FA5039C89 \
nodemon --watch ./ --exec babel-node ./server.js
