var webSocket = new WebSocket('ws://127.0.0.1:8080');

function connectToDataSource() {
    console.log("loaded - creating WebSocket connection");
    webSocket.onopen = function (event) {
        console.log("sending connection confirmation");
        webSocket.send("webapp connected");
    };
};

webSocket.onmessage = function (e) {
    console.log("websocket recieved");
    //var date = new Date(null);
    //date.setSeconds(e.data.values.SessionTime)
    //var timeString = date.toISOString().substr(11, 8);
    document.getElementById('testelem').innerHTML = e.data;
}

