
import Eth from 'Eth'

console.log(Eth.web3.version)


console.log('Eth init account')
Eth.initAccount(acc=>{
	console.log('acc', acc)
})
