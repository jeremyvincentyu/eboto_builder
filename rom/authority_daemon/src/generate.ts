import EthCrypto from 'eth-crypto'

const new_keypair = EthCrypto.createIdentity()

console.log(JSON.stringify(new_keypair))