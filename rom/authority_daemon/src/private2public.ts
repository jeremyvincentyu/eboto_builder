import EthCrypto from 'eth-crypto'

process.stdin.on("data", data => {
    const private_key = data.toString().trim();
    console.log(EthCrypto.publicKeyByPrivateKey(private_key))
    process.exit()
}
)