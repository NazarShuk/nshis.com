if (localStorage.visited == 0 || localStorage.visited == null || localStorage.visited == undefined) {
    name = prompt('What is your name?')
    if (name != null) {
        name = name + Math.floor(Math.random() * 1001)
        localStorage.setItem('name', name)
        localStorage.setItem('visited', '1')
        localStorage.setItem('friends', '{}')
    }
    else if (name == null) {
        window.location.reload()
    }


}
//start

var peer = new Peer(localStorage.name, {
    secure: true,
    host: '0.peerjs.com',
    port: '443'
})
peer.on('open', id => {
    document.getElementById('id').innerHTML = id;
    var friends = JSON.parse(localStorage.friends)
    for (friend in friends) {
        e = document.createElement('button')
        e.innerHTML = "Call " + friend
        e.onclick = function () { Call(friend, "single") }
        document.getElementById('friends').append(e)
        document.getElementById('friends').append(document.createElement('br'))
    }
})


var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
let LocalStream;
var timeouts = []
var callpeers = []
var conns = []
var calls = []
getUserMedia({ video: false, audio: true }, function (stream) {
    LocalStream = stream;
    document.getElementById('Mvideo').srcObject = stream;
    document.getElementById('Mvideo').volume = 0;
    document.getElementById('Mvideo').play()
    document.getElementById('connect').onclick = function () {
        Call(document.getElementById('socketsId').value, "single")
    }
})

peer.on('connection', function (conn) {
    console.log('Now connections are ' + conns)
    conn.on('data', function (data) {
        console.log('Received some data from ' + conn.peer)
        console.log(data)
        var json = JSON.parse(data)
        if (json.type == "hangup") {
            console.log("closing everything with " + conn.peer)
            var callindex = callpeers.indexOf(conn.peer)
            callpeers.splice(callindex, 1)
            var connindex = conns.indexOf(conn)
            conns.splice(connindex, 1)
            if (callpeers != null) {
                document.getElementById("call_name").innerHTML = "In call with " + callpeers
            }
            else {
                document.getElementById("call_name").innerHTML = "Empty call"
            }
            conn.close()
        }
        else if (json.type == "newCaller") {
            Call(json.peer, "multi")
        }
    })
})

peer.on('call', function (call) {
    incall = false
    if (callpeers.length !== 0 && call.metadata != "multi") {
        ringtone = document.getElementById('ringtone')
        ringtone.play()
        PopUp(call.peer + ' is calling', call)
        call.on('stream', Stream => {
            SetupCall(incall, call, Stream)
            conns.forEach(conn => {
                conn.send(JSON.stringify({
                    type: "newCaller",
                    peer: call.peer
                }))
            })
        });
    }
    else {
        if (call.metadata === "single") {
            ringtone = document.getElementById('ringtone')
            ringtone.play()
            PopUp(call.peer + ' is calling', call)
            call.on('stream', Stream => {
                SetupCall(incall, call, Stream)
            });
        }
        else if (call.metadata === "multi") {
            call.answer(LocalStream)
            call.on('stream', Stream => {
                SetupCall(incall, call, Stream)
            });
        }
    }
})

function addFriend() {
    var friend = document.getElementById('frInput').value
    if (friend == null) {
        window.location.reload()
    }
    var friends = JSON.parse(localStorage.friends)
    friends[friend] = {}
    localStorage.setItem('friends', JSON.stringify(friends))
    e = document.createElement('button')
    e.innerHTML = "Позвонить " + friend
    e.onclick = function () { Call(friend, "single") }
    document.getElementById('friends').append(e)
    document.getElementById('friends').append(document.createElement('br'))

}
function Call(name, data) {
    var incall = false
    console.log('CALLING ' + name)
    document.getElementById("call_name").innerHTML = "Calling " + name
    document.getElementById("calling").play()
    var call = peer.call(name, LocalStream, {
        metadata: data
    })
    call.on('stream', stream => {
        SetupCall(incall, call, stream)
    })
}

function PopUp(text, call) {
    var e = document.createElement('div')
    e.id = 'POPUPDIV'
    e.className = 'calldiv'
    e.style.top = randomRange(100, 800)
    e.style.left = randomRange(100, 500)
    var header = document.createElement('div')
    header.id = "calldivheader"
    var center = document.createElement('center')
    var textt = document.createElement('p')
    textt.innerHTML = text
    var btn1 = document.createElement('button')
    var btn2 = document.createElement('button')
    btn1.innerHTML = "Answer"
    btn2.innerHTML = "Block"
    btn1.onclick = function () {
        call.answer(LocalStream); // Answer the call with an A/V stream.
        document.getElementById("ringtone").pause()
        e.outerHTML = ''
    }
    btn2.onclick = function () {
        call.close(); // Answer the call with an A/V stream.
        document.getElementById("ringtone").pause()
        e.outerHTML = ''
        timeouts.forEach(timeout => {
            clearTimeout(timeout)
        })
    }
    document.body.append(e)
    e.append(center)
    e.append(header)
    center.append(textt)
    center.append(btn1)
    center.append(btn2)
    dragElement(e)
}

function SetupCall(incall, call, stream) {
    incall = true
    callpeers.push(call.peer)
    calls.push(call)
    document.getElementById("call_name").innerHTML = "In call with " + callpeers
    Dvideo = new Audio //document.createElement('audio')
    Dvideo.srcObject = stream
    document.getElementById('clients').append(Dvideo)
    document.getElementById("calling").pause()

    var conn = peer.connect(call.peer)
    conn.on('open', () => {
        {
            console.log('Opened connection with ', conn.peer)
            if (conns.includes(conn)) {
                console.log('Connections already include this connection')
            }
            else {
                conns.push(conn)
            }
            console.log('Now connections are ' + conns)
        }
    })

    document.getElementById("hangup").onclick = function () {
        document.getElementById("calling").pause()
        document.getElementById("call_name").innerHTML = "Empty call"
        call.close()
        timeouts.forEach(timeout => {
            clearTimeout(timeout)
        })
        callpeers = []
        calls.forEach(calll => {
            calll.close()
        })
        calls = []
        conns.forEach(conn => {
            console.log('Sent hangup request to ' + conn.peer)
            conn.send(JSON.stringify({
                type: 'hangup'
            }))

            setTimeout(function () {
                conn.close()
            }, 1000)
        })
        conns = []
    }
    Dvideo.onloadedmetadata = function () {
        Dvideo.play();

    }

    var ct = setTimeout(function () {
        if (incall == false) {
            document.getElementById("calling").pause()
            document.getElementById("call_name").innerHTML = "Empty call"
            call.close()
        }
    }, 15000)
    timeouts.push(ct)
}

setInterval(function () {
    if (document.getElementById("call_name").innerHTML === "In call with ") {
        document.getElementById("call_name").innerHTML = "Empty call"
    }
}, 5000)
function randomRange(min, max) {

    return Math.floor(Math.random() * (max - min + 1)) + min;

}
function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(elmnt.id + "header")) {
        // if present, the header is where you move the DIV from:
        document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
    } else {
        // otherwise, move the DIV from anywhere inside the DIV:
        elmnt.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}