#!/usr/bin/env bash

if [[ $1='ropsten' ]]; then
export ACCOUNT_PRIVATE_KEY=0x81ca4ad8135b772466d43e9dd4689b3aac3b3016b2ffe445e4813843ec7fad69
export DC_NETWORK=ropsten
export DAPPS_PATH=./data/dapps/
fi

if [[ $1='local' ]]; then
export ACCOUNT_PRIVATE_KEY=0x0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1
export DC_NETWORK=local
export DAPPS_PATH=./data/dapps/
fi

yarn run tsmon $2