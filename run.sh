#!/usr/bin/env bash

case "$1" in
"local")
    export ACCOUNT_PRIVATE_KEY=0x1882c2a6d0df1210d643f82f69d0bdfa0e2e1eaa963384826a4f24d5b5529e10
    export DC_NETWORK=local
    export DAPPS_PATH=./data/dapps/
    echo "local"
    ;;
"ropsten")
    export ACCOUNT_PRIVATE_KEY=0xf45ce6697b0dd472f5f290953274b279ad15ea956065b9a9a7b443eb8f8a7267
    export DC_NETWORK=ropsten
    export DAPPS_PATH=./data/dapps/
    export PLATFORM_ID=DC_sdk
    echo "ropsten"
    ;;
"rinkeby")
    export ACCOUNT_PRIVATE_KEY=0x3634AB8297A2ECA851A540312214950B0A1E751F45D211574E879DBA37B0F639
    export DC_NETWORK=rinkeby
    export DAPPS_PATH=./data/dapps/
    export PLATFORM_ID=DC_sdk
    echo "rinkeby"
    ;;
"cli-start")
    export ACCOUNT_PRIVATE_KEY=$3
    export DC_NETWORK=$4
    export DAPPS_PATH=./data/dapps/
    echo "cli-start"
    ;;
*)
    echo "Undefined network"
    exit 1
    ;;
esac

yarn run tsmon $2
