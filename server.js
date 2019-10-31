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

var revInfo = null
var sessionJSON = null

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
            wss.clients.forEach(function each(client) {
                console.log("Sending session state data as new client joined");   
                client.send(JSON.stringify(sessionJSON));
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
    var gearOverrideInfo = null
    sessionJSON = JSON.parse(JSON.stringify(rawInfo.data));
    gearOverrideInfo = getRevThresholds(rawInfo.data.DriverInfo.Drivers[0].CarScreenName);
    if (gearOverrideInfo === null) {
        sessionJSON.hardRedLine = sessionJSON.DriverInfo.DriverCarRedLine;
        sessionJSON.softRedLine = sessionJSON.DriverInfo.DriverCarSLFirstRPM;
        sessionJSON.shiftLight = sessionJSON.DriverInfo.DriverCarSLBlinkRPM;
    } else {
        if (!(gearOverrideInfo.hardRedLine === null)) { sessionJSON.hardRedLine = gearOverrideInfo.hardRedLine };
        if (!(gearOverrideInfo.softRedLine === null)) { sessionJSON.softRedLine = gearOverrideInfo.softRedLine };
        if (!(gearOverrideInfo.shiftLight === null)) { sessionJSON.shiftLight = gearOverrideInfo.shiftLight };
    }

    if (!(gearOverrideInfo === null)) {
        
    }
    //Consider if this needs the option to overwrite at well, if so it can be done by improving the override code in getRevThresholds()
    sessionJSON.shiftLightRPM = sessionJSON.DriverInfo.DriverCarSLBlinkRPM;
    
    wss.clients.forEach(function each(client) {
        console.log("Sending Session State Data");    
        client.send(JSON.stringify(sessionJSON));
    })
})

//hardRedLine, softRedLine and shiftLight are used in the visuals of the rev counter
//They can be overridden here for specific cars
//This is definitely required where the telemetry adjusts the redline for launch control etc
//Might have other uses and need expanding on in the future
function getRevThresholds(carName) {
    var revInfo = {
        hardRedLine: null,
        softRedLine: null,
        shiftLight: null
    };
    switch (carName) {
        case "Audi RS 3 LMS TCR": 
            revInfo.hardRedLine = 7000;
            return revInfo;
        default:
            return null;
    }
}







