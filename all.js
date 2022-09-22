
function reportWindowSize() {
	let vh =  $(window).height() * 0.01;
	let aaa = window.innerHeight * 0.01;
	// Then we set the value in the --vh custom property to the root of the document
	document.documentElement.style.setProperty('--vh', `${aaa}px`);
	console.log(vh, "reportWindowSize",aaa)
}
window.onresize = reportWindowSize;

async function screenshot() {
	let canvasWidth = 480
	// *2是因為2張 remote與local
	let canvasHeight = 270 * 2
	// calculate stream width and height
	// canvas width is 640 and height is 720
	let divContainer = document.getElementById('div-canvas')
	var canvas = document.createElement('canvas')
	canvas.id = "canvas-screenshot";
	canvas.width = canvasWidth
	canvas.height = canvasHeight
	canvas.style.zIndex = 8
	canvas.style.position = "absolute"

	let context2D = canvas.getContext('2d')
	var img = new Image()
	// draw local stream at (0,0)
	context2D.drawImage(localVideo, 0, 0, canvasWidth, canvasHeight / 2)
	// draw remote stream at (0, height/2)
	context2D.drawImage(remoteVideo, 0, canvasHeight / 2, canvasWidth, canvasHeight / 2)

	img.id = "screenshot-img"
	img.src = canvas.toDataURL("image/jpg", "0.9")
	img.width = canvasWidth
	img.height = canvasHeight

	// only display picture to html
	divContainer.innerHTML = ''
	divContainer.appendChild(img)

	img.onload = () => {
		// remove canvas
		canvas.remove()

		// start to downdload
		var a = document.createElement("a")
		a.href = img.src
		a.download = "test.jpg"
		a.click()
	}
}

$(document).ready(() => {
	localVideo.style.opacity = 0
	remoteVideo.style.opacity = 0
	localVideo.onplaying = () => { localVideo.style.opacity = 1 }
	remoteVideo.onplaying = () => { remoteVideo.style.opacity = 1 }
	// $('#btn-screenshot').click(function() {
	// 	screenshot()
	// })

	// showController(false)
})

function showController(isShow) {
	if (isShow) {
		$('.row.footer').show()
	} else {
		$('.row.footer').hide()
	}
}

let localVideo = document.getElementById("local-video")
let remoteVideo = document.getElementById("remote-video")

let myRoomId = "c-d-p"

// 需傳GET參數role區分
// 可選傳GET參數peer: socket.inRoom可以查看有誰在房間會展示

// var socket = io(window.location.protocol + "//" + window.location.host)
// https://icare.sprinf.com:60000
var socket = io("https://socket2.sprinf.com:5502")

socket.on("connect", () => {
	console.log('socket id: ' + socket.id)

	// let url = new URLSearchParams(window.location.search)
	// let peer = url.get("peer")
	// let role = url.get("role")

	joinWebRTCRoomData()
})

socket.on("OnJoinRoom", (data) => {

	if (data.includes("on-webrtc")) {
		let d = JSON.parse(data)
		socket.withId = d.from
		startCall()

	} else {
		// normal data
	}

}).on("OnLeaveRoom", (roomId) => {
	if (roomId == myRoomId) {
		console.log('對方離開房間')
		hangup()
	}

}).on("OnJsonData", (data) => {

	// this is webrtc data
	if (data.includes("on-webrtc")) {
		let d = JSON.parse(data)
		// 對方要求本端建立連線
		if (d.action == "on-webrtc-create") {
			console.log('on-webrtc-create: 對方要求本端建立連線')
			onCreate(d.from)
			return
		}

		// 對方建立連線完畢，要求開始接收offer
		if (d.action == "on-webrtc-start") {
			console.log('on-webrtc-start: 對方建立連線完畢，要求開始接收offer')
			onStart()
			return
		}

		// 對方傳offer過來
		if (d.action == "on-webrtc-offer") {
			console.log('on-webrtc-offer: 對方傳offer過來')
			if (d.extra && d.extra.offer) {
				onOffer(d.extra.offer)
			}
			return
		}

		// 對方傳answer過來
		if (d.action == "on-webrtc-answer") {
			console.log('on-webrtc-answer: 對方傳answer過來')
			if (d.extra && d.extra.answer && socket.pc) {
				onAnswer(d.extra.answer)
			}
			return
		}

		// 收到對方的icecandidate
		if (d.action == "on-webrtc-icecandidate") {
			if (d.extra && d.extra.candidate) {
				console.log('on-webrtc-icecandidate: 收到對方的icecandidate')
				let c = d.extra.candidate
				onICECandidate(c)
			}
			return
		}

		// 對方傳on-webrtc-calling過來(對方通話中)
		if (d.action == "on-webrtc-calling") {
			onCalling()
			return
		}

	}



})

const servers = {
	iceServers: [
		{ 'urls': 'stun:stun.l.google.com:19302' },
		{ 'urls': 'stun:stun1.l.google.com:19302' }
	],
	iceCandidatePoolSize: 10,
}

/**
qvga: 		320*240
vga:  		640*480
hd:   		1280*720
full-hd: 	1920*1080
4k-tv: 		3840*2160
4k-cinema: 	4096*2160
8k: 		7680*4320
*/
// var screenWidth = screen.width;
// var screenHeight = screen.height;
// const pageWidth  = document.documentElement.scrollWidth;
// const pageHeight = document.documentElement.scrollHeight;
// let wwww=document.querySelector(".wwww")
// let qqqq=document.querySelector(".qqqq")
// wwww.innerHTML=pageWidth
// qqqq.innerHTML=pageHeight
// console.log(pageWidth,pageHeight)
var videoConfig = {
	width: 100,
	height: 100,
	aspectRatio: { exact: 1.77 },
	facingMode: "user"
}
var audioConfig = {
	volume: 1.0,
	echoCancellation: true,
	noiseSuppression: true
}

let localStream = null
let remoteStream = null
async function localvideoLoading(params) {
	const stream = await navigator.mediaDevices.getUserMedia({ video: videoConfig, audio: audioConfig })
	localVideo.srcObject = stream
	localStream = stream
	localVideoViewChange()
}
localvideoLoading()
let cameraVideo = "user"
async function reverseCamera() {
	// let constraints = ""
	// localStream.getTracks().forEach((track) => {
	// 	track.stop();
	// });
	// if (cameraVideo == "user") {
	// 	constraints = {
	// 		video: {
	// 			width: 100,
	// 			height: 100,
	// 			aspectRatio: { exact: 1.77 },
	// 			facingMode: "environment"
	// 		},
	// 		audio: audioConfig
	// 	};
	// 	cameraVideo = "environment"
	// } else {
	// 	constraints = {
	// 		video: {
	// 			width: 100,
	// 			height: 100,
	// 			aspectRatio: { exact: 1.77 },
	// 			facingMode: "user"
	// 		},
	// 		audio: audioConfig
	// 	};
	// 	cameraVideo = "user"
	// }
	// const stream = await navigator.mediaDevices.getUserMedia(constraints);
	// localVideo.srcObject = stream
	// localStream = stream







	
}
// socket receiver
async function onCreate(fromId) {
	// 收到建立連線請求，但已有連線
	// 通話中...
	// 這是第二個 他沒有pc peer完才會有連接到pc
	if (socket.pc) {
		await sendWebRTCData("on-webrtc-calling", {})
		return
	}

	socket.withId = fromId
	await openLocalCamera()
	await createPeerConnection()
	await sendWebRTCData("on-webrtc-start", {})
}

async function onStart() {
	if (!socket.pc) {
		await createPeerConnection()
		await createOffer()
	}
}

async function onOffer(offer) {
	console.log(offer)
	await completeRemoteDescription(offer)
	await answerOffer()
}

async function onAnswer(answer) {
	console.log(answer)
	await completeRemoteDescription(answer)
}

async function onCalling() {
	console.log('on-webrtc-calling: 對方通話中')
	alert(`對方通話中...`)
}

async function startCall() {
	await openLocalCamera()
	// 要求對方建立PeerConnection
	await sendWebRTCData("on-webrtc-create", {})
}

async function openLocalCamera() {
	try {
		// 處理local stream
		if (!localStream) {
			const stream = await navigator.mediaDevices.getUserMedia({ video: videoConfig, audio: audioConfig })
			localVideo.srcObject = stream
			localStream = stream
			localVideoViewChange()
		}
		// 處理remote stream
		if (!remoteStream) {
			// 處理remote stream
			remoteStream = new MediaStream()
			remoteVideo.srcObject = remoteStream
		}

	} catch (e) {
		alert(`取得視訊鏡頭與麥克風錯誤: ${e.name}`)
	}
}
function localVideoViewChange() {
	$('.patientCamera').show()
	$('.patientVideo').hide()
}
// 收到on-webrtc-start後呼叫，對方已建立PeerConnection
async function createPeerConnection() {
	let pc = new RTCPeerConnection(servers)
	socket.pc = pc

	pc.ontrack = event => {
		remoteStream.addTrack(event.track, remoteStream)
	}

	// 監聽candidate事件
	pc.onicecandidate = event => {

		console.log(event.candidate)

		// 傳送Candidate給對方
		sendWebRTCData("on-webrtc-icecandidate", { candidate: event.candidate })
	}

	// 監聽PeerConnection連線狀態
	pc.oniceconnectionstatechange = event => {
		if (socket.pc) {
			let pc = socket.pc
			// 狀態有: checking, connected, disconnected
			console.log('peer狀態: ' + pc.iceConnectionState)

			// 如果是disconnected 對方與我的peerConnection斷線
			if (pc.iceConnectionState == 'disconnected') {
				hangup()
				alert("對方已斷線")
			}

			if (pc.iceConnectionState == 'connected') {
				showController(true)
			}

		}
	}

}

async function closePeerConnection() {
	await socket.pc.close()
	socket.withId = null
	socket.pc = null
}

async function joinWebRTCRoomData() {
	let d = {
		from: socket.id,
		to: "",
		action: "on-webrtc-room",
		extra: {}
	}

	socket.emit("JoinRoom", myRoomId, JSON.stringify(d))
}

async function sendWebRTCData(action = "", extra = {}) {

	let d = {
		from: socket.id,
		to: socket.withId,
		action: action,
		extra: extra
	}

	socket.emit("JsonData", socket.withId, JSON.stringify(d))
}

// async function leaveRoom() {
	
// }

async function hangup() {

	if (localStream) {
		localStream.getTracks().forEach(track => {
			track.stop()
		})
		localStream = null
	}

	if (remoteStream) {
		remoteStream = null
	}

	await closePeerConnection()
	await leaveRoom()
	showController(false)
	videoIsEnd()
}

async function answerOffer() {
	if (socket.pc) {
		let pc = socket.pc

		if (localStream) {
			localStream.getTracks().forEach(track => {
				pc.addTrack(track, localStream)
			})
		}

		// 建立answer給對方
		try {
			const answerDes = await pc.createAnswer()
			await pc.setLocalDescription(answerDes)
			console.log('create answer')
			await sendWebRTCData("on-webrtc-answer", { answer: answerDes })
		} catch (e) {
			console.log(`建立Answer失敗: ${e.toString()}`)
		}
	}
}

async function createOffer() {
	if (socket.pc) {
		// 建立Offer給對方
		let pc = socket.pc
		if (localStream) {
			localStream.getTracks().forEach(track => {
				pc.addTrack(track, localStream)
			})
		}
		let offerOptions = {
			offerToReceiveAudio: 1,
			offerToReceiveVideo: 1
		}
		try {
			const offerDes = await pc.createOffer()
			await pc.setLocalDescription(offerDes)
			console.log('create offer')

			// 傳送Offer給對方
			console.log('sendOffer')
			await sendWebRTCData("on-webrtc-offer", { offer: offerDes })
		} catch (e) {
			console.log(`建立Offer失敗: ${e.toString()}`)
		}
	}
}

async function onICECandidate(candidate) {
	if (socket.pc) {
		let pc = socket.pc
		try {
			await socket.pc.addIceCandidate(candidate)
		} catch (e) {
			console.log(`加入Candidate失敗: ${e.toString()}`)
		}
	}
}

async function completeRemoteDescription(des) {
	if (socket.pc) {
		let pc = socket.pc
		try {
			let remoteDes = new RTCSessionDescription(des)
			await socket.pc.setRemoteDescription(remoteDes)
			videoViewChangeFinal()
		} catch (e) {
			console.log(`completeRemoteDescription: ${e.toString()}`)
		}
	}
}
function videoViewChangeFinal() {
	document.querySelector(".patientCamera").style.display = "flex";

	document.querySelector(".doctorCamera").style.display = "flex";
	
	// $('.ConnectCamera').show()
	$('.unConnectCamera').hide()
	// icon
	$('.exit').hide()
	// icon
	$('.hangUpPhone').show()


}
function audio(isEnabled) {

	if (localVideo.srcObject) {
		localVideo.srcObject.getVideoTracks()[0].enabled = isEnabled
	}
}

function video(isEnabled) {

	if (localVideo.srcObject) {
		localVideo.srcObject.getAudioTracks()[0].enabled = isEnabled
	}
}
let loudSound = false
function loudspeaker(params) {
	let loudSpeakClass = document.querySelector(".loudSpeakClass")
	if (!loudSound) {
		loudSound = true
		console.log("不擴音轉成擴音")
		loudSpeakClass.classList.add("iconOpen")
	} else {
		loudSound = false
		console.log("這是擴音")
		loudSpeakClass.classList.remove("iconOpen");
	}
	console.log(loudSpeakClass, "loudSpeakClass")
}

let isMuted = "unMuted"
function micMuted(params) {

	let muted = document.querySelector(".mutedClass .muted")
	
	if (isMuted == "unMuted") {
		localStream.getAudioTracks()[0].enabled = false
		isMuted = "muted"
		muted.classList.toggle("text-danger")
	} else {
		localStream.getAudioTracks()[0].enabled = true
		isMuted = "unMuted"
		muted.classList.toggle("text-danger")
	}
}
function videoIsEnd() {
	$('.container-fluid-fix').hide()
	$('.calling-finished').show()


}
function leaveRoom() {
	localStream = null
	remoteStream = null
	// localStream.getTracks().forEach(track => {
	// 	track.stop()
	// })
	// if (localStream) {
	// 	localStream.getTracks().forEach(track => {
	// 		track.stop()
	// 	})
	// 	localStream = null
	// }

	// if (remoteStream) {
	// 	remoteStream = null
	// }
	// hangup()
	// localStream.getTracks().forEach(track => {
	// 	track.stop()
	// })
	// 	localStream = null
	socket.emit("LeaveRoom", myRoomId)
	// closePeerConnection()

	console.log("已經離開房間")

	// $('.container-fluid-fix').hide()
	// $('.calling-finished').show()
}