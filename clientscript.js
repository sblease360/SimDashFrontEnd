var webSocket = new WebSocket('ws://127.0.0.1:8080');

//function checkDataSourceConnection() {
//    console.log("Checking connection to WebSocket");
//};

function checkConnectionState() {
    switch (webSocket.readyState) {
        case 0: //connecting
            document.getElementById('dataSourceStatus').innerHTML = 'No connection to datasource, refresh the page to retry'
            break;
        case 1: //open
            document.getElementById('dataSourceStatus').innerHTML = 'Connection to datasource established'
            break;
        case 2: //closing
            document.getElementById('dataSourceStatus').innerHTML = 'Connection to datasource closing'
            break;
        case 3: //closed
            document.getElementById('dataSourceStatus').innerHTML = 'No connection to datasource, refresh the page to retry'
            break;
        default: //bad things have happened

    }
};

webSocket.onmessage = function (e) {
    console.log("telemetry data recieved");
    //var date = new Date(null);
    //date.setSeconds(e.data.values.SessionTime)
    //var timeString = date.toISOString().substr(11, 8);
    document.getElementById('testelem').innerHTML = e.data;
}


webSocket.onopen = function (event) {
    console.log("WebSocket connection open, sending confirmation to data source");
    console.log(webSocket.readyState);
    webSocket.send("webapp connected and ready to recieve data");
    checkConnectionState();

};
