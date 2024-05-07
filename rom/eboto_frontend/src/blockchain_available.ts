    export default async function check_blockchain_available(){
        try{
        const blockchain_available_response = await fetch("/late_phase",{method: "GET"})
        const blockchain_available: boolean = await blockchain_available_response.json()
        return blockchain_available
    }
        catch{
            return check_blockchain_available()
        }
    }