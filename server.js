'use strict';

//Websocket stuff
const WebSocket = require('ws');

const wss = new WebSocket.Server({
    port: 8080
});

//iRacing Stuff
var irsdk = require('node-irsdk');
irsdk.init({
    telemetryUpdateInterval: 50,
    sessionInfoUpdateInterval: 5000
});
var iracing = irsdk.getInstance()

console.log('\nWaiting for iRacing...')

iracing.on('Connected', function () {
    console.log('\nConnected to iRacing!.')
})

iracing.once('Disconnected', function () {
    console.log('iRacing closed.')
})




//Main logic
wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        console.log('recieved: %s', message);
    });

    iracing.on('Telemetry', function (telem) {
        wss.clients.forEach(function each(client) {
            console.log("Sending Telem Data at session time %o", telem.values.SessionTime);
            client.send(JSON.stringify(telem.values));
        })
    })
})








