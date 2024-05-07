  import EthCrypto from 'eth-crypto'
  import post_body from './post_body'
  
  export async function get_authentication_token(private_key: string, election_name: string, control_address: string){ 
            //Authenticate first with the isolation server
            const authResponse = await fetch("/request_auth_token",post_body(JSON.stringify({election_name,control_address})))
            const crypted_token: string = await authResponse.text()
            console.log(`Crypted token is ${crypted_token}`)
            //Decrypt the auth token
            const crypted_object = EthCrypto.cipher.parse(crypted_token)
            const auth_token = await EthCrypto.decryptWithPrivateKey(private_key,crypted_object)

            return auth_token
  }