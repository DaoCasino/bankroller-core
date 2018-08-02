#!/usr/bin/env bash

# replace web3 
mkdir web3-core-method
cd ./web3-core-method
git clone --branch dc-patch-1 --depth=1 https://github.com/DaoCasino/web3.js.git .
cp -f ./packages/web3-core-method/src/index.js ../node_modules/web3-core-method/src
cd ../
rm -rf ./web3-core-method