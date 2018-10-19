#!/usr/bin/env bash

if [ $1 == 'ropsten' ]; then
export ACCOUNT_PRIVATE_KEY=0x4cf22d44fa06be425b26a2e1d2cd05866831b27d1354a648bf92b8a1d91cc3e5
export DC_NETWORK=ropsten
export DAPPS_PATH=./data/dapps/
fi

if [ $1 == 'local' ]; then
export ACCOUNT_PRIVATE_KEY=0x0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1
export DC_NETWORK=local
export DAPPS_PATH=./data/dapps/
fi

yarn run tsmon $2