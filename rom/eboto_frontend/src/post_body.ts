export default function post_body(body: string){
return {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body
}
}