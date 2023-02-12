let APP_ID = "8ae2fa891bc8477faf0ae754d67ca117" //agora app id

let token = null;
let uid = String(Math.floor(Math.random() * 10000)) //generate random userids

let client;
let channel;

let localStream; //local user
let remoteStream; //remote user
let peerConnection


const servers = { //to generate ice candidates
    iceServers:[
        {
            urls:['stun:stun1.l.google.com:19302','stun:srun2.l.google.com:19302'] //to determine ip address
        }
    ]
}

let init = async () => {
    client = await AgoraRTM.createInstance(APP_ID)
    await client.login({uid, token})

    channel = client.createChannel('main')
    await channel.join()
    channel.on('MemberJoined', handleUserJoined)

    client.on('MessageFromPeer', handleMessageFromPeer)

    localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:false}) //user video and audio access
    document.getElementById('user-1').srcObject = localStream //apply the video and audio into html video tag
       
}

let handleMessageFromPeer = async (message, MemberId) => {
    message = JSON.parse(message.text)


    if(message.type == 'offer'){ //we get offer
        createAnswer(MemberId, message.offer) //create answer
    }
    if(message.type == 'answer'){ //we get answer
        addAnswer(message.answer) //add answer
    }
    if(message.type == 'candidate'){
        if(peerConnection){
            peerConnection.addIceCandidate(message.candidate)
        }
    }
}

let handleUserJoined = async (MemberId) => {
    console.log('A new user joined the channel:', MemberId)
    createOffer(MemberId)
}

let createPeerConnection = async (MemberId) => {
    peerConnection = new RTCPeerConnection(servers) //to create a peer connection with the ice candidates

    remoteStream = new MediaStream()
    document.getElementById('user-2').srcObject = remoteStream

    if(!localStream){ 
        localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:false}) //incase localStream doesnt work
        document.getElementById('user-1').srcObject = localStream
    }

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream) //video is added into the peer connection
    })

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) =>{ //video is taken from the peer connection
            remoteStream.addTrack(track)
        })
    }

    peerConnection.onicecandidate = async(event) =>{
        if(event.candidate){
            client.sendMessageToPeer({text:JSON.stringify({'type':'candidate', 'candidate':event.candidate})}, MemberId)

        }
    }

}

let createOffer =  async (MemberId) => {
    await createPeerConnection(MemberId)
    let offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    client.sendMessageToPeer({text:JSON.stringify({'type':'offer', 'offer':offer})}, MemberId)
}

let createAnswer = async (MemberId, offer) => {
    await createPeerConnection(MemberId)

    await peerConnection.setRemoteDescription(offer)
    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    client.sendMessageToPeer({text:JSON.stringify({'type':'answer', 'answer':answer})}, MemberId)

}
let addAnswer = async(answer) => {
    if(!peerConnection.currentRemoteDescription){
        peerConnection.setRemoteDescription(answer)
    }
}

init() //execute on startup