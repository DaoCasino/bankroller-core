clear
echo ''
echo ''
echo ' Postinstall started '
echo ''
echo ''
mkdir web3-core-method
cd ./web3-core-method
sleep 1
echo ''
echo ''
git clone --branch dc-patch-1 --depth=1 https://github.com/DaoCasino/web3.js.git .
echo ''
echo ''
sleep 1
cp -f ./packages/web3-core-method/src/index.js ../node_modules/web3-core-method/src
echo ''
echo ''
sleep 1
cd ../
rm -rf ./web3-core-method
echo ''
echo ''
echo 'Install compleate'
echo ''
