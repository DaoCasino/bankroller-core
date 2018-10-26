#!/usr/bin/env bash

if [ $1 == 'ropsten' ]; then
export ACCOUNT_PRIVATE_KEY=0xf45ce6697b0dd472f5f290953274b279ad15ea956065b9a9a7b443eb8f8a7267
export DC_NETWORK=ropsten
export DAPPS_PATH=./data/dapps/
export PLATFORM_ID=DC_sdk
echo "ropsten"
fi

if [ $1 == 'local' ]; then
export ACCOUNT_PRIVATE_KEY=0x3F8B1B2FC40E744DA0D5D748654E19C5018CC2D43E1FD3EF9FD89E6F7FC652A0
export DC_NETWORK=local
export DAPPS_PATH=./data/dapps/
echo "local"
fi

if [ $1 == 'rinkeby' ]; then
export ACCOUNT_PRIVATE_KEY=0x3634AB8297A2ECA851A540312214950B0A1E751F45D211574E879DBA37B0F639
export DC_NETWORK=rinkeby
export DAPPS_PATH=./data/dapps/
export PLATFORM_ID=DC_sdk
echo "rinkeby"
fi

yarn run tsmon $2
