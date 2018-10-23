#!/usr/bin/env bash

if [ $1 == 'ropsten' ]; then
export ACCOUNT_PRIVATE_KEY=0xcc3e6518fa389a03fc86d124fcc608f6ac76a3cb2aa2416d4b4ba33e69008924
export DC_NETWORK=ropsten
export DAPPS_PATH=./data/dapps/
fi

if [ $1 == 'local' ]; then
export ACCOUNT_PRIVATE_KEY=0x0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1
export DC_NETWORK=local
export DAPPS_PATH=./data/dapps/
fi

if [ $1 == 'rinkeby' ]; then
export ACCOUNT_PRIVATE_KEY=0x45D090A0CA46A6BD3DF07923FBEB6631B1C257112E0047C2140B0D2FA5039C89
export DC_NETWORK=rinkeby
export DAPPS_PATH=./data/dapps/
fi

yarn run tsmon $2
