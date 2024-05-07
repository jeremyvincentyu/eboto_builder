import EthCrypto from 'eth-crypto'

async function encrypt(public_key: string,payload: string){
    const encrypted_object= await EthCrypto.encryptWithPublicKey(public_key,payload)
    const encrypted_string = EthCrypto.cipher.stringify(encrypted_object)
    console.log(encrypted_string)
}


interface plain_with_pubkey{
    public_key: string,
    plain: string
}

process.stdin.on("data",data=>{
    const payload = data.toString().trim();
    const encrypted_object: plain_with_pubkey = JSON.parse(payload);
    encrypt(encrypted_object.public_key,encrypted_object.plain).then(
    ()=>
    {process.exit()}
    )
})