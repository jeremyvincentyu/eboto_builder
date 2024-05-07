import EthCrypto from 'eth-crypto'

async function sign(private_key: string, payload: string) {
    const hashed_object = EthCrypto.hash.keccak256(payload)
    const signed_hash = await EthCrypto.sign(private_key, hashed_object)
    console.log(signed_hash)
}


interface crypted_with_key {
    private_key: string,
    payload: string
}

process.stdin.on("data", data => {
    const encrypted_and_key = data.toString().trim();
    const encrypted_object: crypted_with_key = JSON.parse(encrypted_and_key);
    sign(encrypted_object.private_key, encrypted_object.payload).then(
        () => { process.exit() }
    )
})