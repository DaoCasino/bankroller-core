#!/usr/bin/env bash

if [ $1 == 'ropsten' ]; then
export ACCOUNT_PRIVATE_KEY=0xdbb54842330d431c420b6ae6a7319ffdfaa705dcf0bc3ea2229d67e92324e595
export DC_NETWORK=ropsten
export DAPPS_PATH=./data/dapps/
echo "ropsten"
fi

if [ $1 == 'local' ]; then
export ACCOUNT_PRIVATE_KEY=0x0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1
export DC_NETWORK=local
export DAPPS_PATH=./data/dapps/
echo "local"
fi

if [ $1 == 'rinkeby' ]; then
export ACCOUNT_PRIVATE_KEY=0x45D090A0CA46A6BD3DF07923FBEB6631B1C257112E0047C2140B0D2FA5039C89
export DC_NETWORK=rinkeby
export DAPPS_PATH=./data/dapps/
echo "rinkeby"
fi

yarn run tsmon $2
