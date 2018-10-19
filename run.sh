#!/usr/bin/env bash

if [ $1 == 'ropsten' ]; then
export ACCOUNT_PRIVATE_KEY=0x74e00f9c8abbdecec33dbb4f10e2305a4d764a54eaa05b7364265dc1aa1d2d0b
export DC_NETWORK=ropsten
export DAPPS_PATH=./data/dapps/
fi

if [ $1 == 'local' ]; then
export ACCOUNT_PRIVATE_KEY=0x0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1
export DC_NETWORK=local
export DAPPS_PATH=./data/dapps/
fi

yarn run tsmon $2
