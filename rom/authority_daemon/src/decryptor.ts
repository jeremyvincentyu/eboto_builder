import EthCrypto from 'eth-crypto'

async function decrypt(private_key: string,payload: string){
    const encrypted_object=EthCrypto.cipher.parse(payload)
    const decrypted_string = await EthCrypto.decryptWithPrivateKey(private_key, encrypted_object)
    console.log(decrypted_string)
}


interface crypted_with_key{
    private_key: string,
    payload: string
}

process.stdin.on("data",data=>{
    const encrypted_and_key = data.toString().trim();
    const encrypted_object: crypted_with_key = JSON.parse(encrypted_and_key);
    decrypt(encrypted_object.private_key,encrypted_object.payload).then(
    ()=>
    {process.exit()}
    )
})