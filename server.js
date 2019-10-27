'use strict';

//Websocket stuff
const WebSocket = require('ws');

const wss = new WebSocket.Server({
    port: 8080
});

//iRacing Stuff
var irsdk = require('node-irsdk');
irsdk.init({
    telemetryUpdateInterval: 500,
    sessionInfoUpdateInterval: 5000
});
var iracing = irsdk.getInstance()

//Main logic
wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        console.log('recieved: %s', message);
    });

    console.log('\nWaiting for iRacing instance')

    iracing.on('Connected', function () {
        console.log('\nConnected to iRacing!.');
        wss.clients.forEach(function each(client) {
            client.send("Connected to iRacing");
        })
    })

    iracing.once('Disconnected', function () {
        console.log('iRacing closed.');
        wss.clients.forEach(function each(client) {
            client.send("Disconnected from iRacing");
        })

    })

    iracing.on('Telemetry', function (telem) {
        wss.clients.forEach(function each(client) {
            console.log("Sending Telem Data at session time %o", telem.values.SessionTime);
            client.send(JSON.stringify(telem.values));
        })
    })

    iracing.on('SessionInfo', function (sessionInfo) {
        var carInfo = null
        wss.clients.forEach(function each(client) {
            console.log("Sending Session State Data");
            carInfo = getRevThresholds(sessionInfo.data.DriverInfo.Drivers[0].CarScreenName);
            client.send(JSON.stringify(carInfo));
        })
    })
})

function getRevThresholds(carName) {
    var revInfo = null
    switch (carName) {
        case "Audi RS 3 LMS TCR":
            revInfo = {
                hardRedline: 6985,
                softRedline: 6700,
                shiftLight: 6700,
            };
            return revInfo;
        default: 
            revInfo = {
                hardRedline: 5000,
                softRedline: 4000,
                shiftLight: 4500,
            };
            return revInfo;
    }
}







