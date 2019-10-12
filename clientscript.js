var webSocket = new WebSocket('ws://127.0.0.1:8080');

function connectToDataSource() {
    console.log("loaded - creating WebSocket connection");
    webSocket.onopen = function (event) {
        webSocket.send("Connection to data sending application established");
    };
};

webSocket.onmessage = function (e) {
    console.log("websocket recieved: %O", e.data);
    //var date = new Date(null);
    //date.setSeconds(e.data.values.SessionTime)
    //var timeString = date.toISOString().substr(11, 8);
    document.getElementById('testelem').innerHTML = e.data;
}

