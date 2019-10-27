'use strict';

function isJSON(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
};

function isAO(val) {
    return val instanceof Array || val instanceof Object ? true : false;
};

//Websocket stuff
const WebSocket = require('ws');

const wss = new WebSocket.Server({
    port: 8080
});

//iRacing Stuff
var irsdk = require('node-irsdk');
irsdk.init({
    telemetryUpdateInterval: 50,
    sessionInfoUpdateInterval: 500
});
var iracing = irsdk.getInstance()

console.log('\nWaiting for iRacing instance')

//WebSocket data
wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        console.log('recieved: %s', message);
        if (iracing.sessionInfo == null) {
            console.log("Connected to output site, no iRacing connection");
        } else {
            console.log("Connection established - confirming iRacing status");
            wss.clients.forEach(function each(client) {
                client.send("Connected to iRacing");
            })
        };
    });
})

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

iracing.on('SessionInfo', function (rawInfo) {
    var revInfo = null
    var sessionJSON = null
    //Get rev counter details and add them to session data before sending
    revInfo = getRevThresholds(rawInfo.data.DriverInfo.Drivers[0].CarScreenName);
    sessionJSON = JSON.parse(JSON.stringify(rawInfo.data));

    sessionJSON.hardRedline = revInfo.hardRedline;
    sessionJSON.softRedline = revInfo.softRedline;
    sessionJSON.shiftLight = revInfo.shiftLight;
    //console.log(typeof sessionJSON);
    //console.log(isAO(sessionJSON));
    //console.log(sessionJSON.DriverInfo.Drivers[0].CarScreenName);
    //console.log(sessionJSON.softRedline);
    wss.clients.forEach(function each(client) {
        console.log("Sending Session State Data");    
        client.send(JSON.stringify(sessionJSON));
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







