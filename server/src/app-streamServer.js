/**
 * Created by dmitryChernushchenko on 23/10/17.
 * TrackBox Service
 */

let RacerStreamerServer = require('./streamServer');

global._projDir = __dirname;

// Set gateway in UTC time
process.env.TZ = "Europe/London";

let dbDriver = null;

let fs = require('fs');
let debug = require('debug')('ProjectServer:streamer');
let http = require('http');

let saveLogToFile = false;

global.tracer = require( 'tracer' ).colorConsole({

    dateformat : "HH:MM:ss.L",
    format: [ '{{timestamp}} {{title}}: {{message}} [{{file}}:{{line}}]' ],
    transport : function(data) {

        console.log(data.output);

        let show = false;
        if (data.output.indexOf("error:") > -1) show = true;
        if (data.output.indexOf("POOL:") > -1) show = true;

        if(show === true){
            //adminLog.log(data.output);
        }

        if(saveLogToFile){
            fs.open('./logs/serviceStreamer.log', 'a', '0666', function(e, id) {
                fs.write(id, data.output+"\n", null, 'utf8', function() {
                    fs.close(id, function() {
                    });
                });
            });

        }
    }
});


//process.argv.forEach(function(val, index) {
for (let n=0; n<process.argv.length; ++n) {
    //console.log(`${index}: ${val}`);
    let strings = process.argv[n].split(':');
    if (strings.length > 1) {
        if (strings[0] === 'config') {
            global.config = require( './' + strings[1]);
        }
    }
}

if (global.config === undefined) global.config = require( '../config' );


//Get local address:port from environment and store in Express.
if (typeof process.env.PORT === "undefined"){
    global.localPort = global.config['ports'].service;
}
else {
    global.localPort = process.env.PORT;
}

global.localAddress = global.config.address;


// Start Streamer Server
global.tracer.info("starting Track Streamer Service on port ", global.localPort);
new RacerStreamerServer(global.localPort);

setInterval(function()
{

    //force garbage collection to look for leaks
    if (global.gc) {
        global.gc();
    } else {
        // console.log('Garbage collection unavailable.  Pass --expose-gc --always-compact when launching node to enable forced garbage collection.');
    }

}, 60000*3); //tree minutes.
