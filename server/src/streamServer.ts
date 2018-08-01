// import { createServer, Server } from 'http';
// import * as express from 'express';
// import * as socketIo from 'socket.io';
//
// export class RacerStreamerServer {
//     public static PORT:number = 8080;
//     private app: express.Application;
//     private server: Server;
//     private io: SocketIO.Server;
//     private port: string | number;
//
//     constructor(port: number) {
//         RacerStreamerServer.PORT = port;
//         this.createApp();
//         this.config();
//         this.createServer();
//         this.sockets();
//         this.listen();
//     }
//
//     private createApp(): void {
//         this.app = express();
//     }
//
//     private createServer(): void {
//         this.server = createServer(this.app);
//     }
//
//     private config(): void {
//         this.port = process.env.PORT || RacerStreamerServer.PORT;
//     }
//
//     private sockets(): void {
//         this.io = socketIo(this.server);
//     }
//
//     private listen(): void {
//         let _ths = this;
//
//         this.server.listen(this.port, () => {
//             console.log('Running server on port %s', this.port);
//         });
//
//         this.io.on('connect', (socket: any) => {
//             console.log('Connected client on port %s.', this.port);
//             socket.on('message', function(m) {
//                 console.log('[server](message): %s', JSON.stringify(m));
//                 _ths.io.emit('message', m);
//             });
//
//             socket.on('disconnect', () => {
//                 console.log('Client disconnected');
//             });
//         });
//     }
//
//     public getApp(): express.Application {
//         return this.app;
//     }
// }

/**
 * Created by Tomcat  on 31/07/18.
 *
 */
//import { StreamSessionManager } from "./streamSessionManager";

declare let global: any;
//declare function require(name: string): any;
let express = require('express');
let bodyParser = require('body-parser');
let HttpStatus = require('http-status-codes');
let StreamSessionManager = require('./streamSessionManager'); // singleton class

import { createServer, Server } from 'http';

import * as socketIo from 'socket.io';

import { Message } from '../../model';

import { StreamSessions } from './streamSessions'
import { StreamSession } from './streamSession'


//CORS middleware
let allowCrossDomain = function(req: any, res: any, next: any) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', true);

    next();
};

export class RacerStreamerServer {

	serverPort: number;
	serviceId: string;
	expressApp: any;
    private server: any;
    private io: SocketIO.Server;

    protected streamSessions: any;

    constructor(port: number, id?: string) {

		this.serviceId = id;
		this.serverPort = port;
		this.expressApp = express();

        this.server = createServer(this.expressApp);
        this.io = socketIo(this.server);

		this.expressApp.use(bodyParser.json({limit: "50mb"}));
		this.expressApp.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit: 50000}));
        this.expressApp.use(allowCrossDomain);

        StreamSessionManager.getInstance().init(this, true, this.serviceId);
        this.streamSessions = StreamSessionManager.getInstance();

        //
		// RESTful CRUD requests routing
		//
		// (POST) create, login & logout requests
		this.routePOSTRequests();
		//
		// (GET) actions with participants
		this.routeGETRequests();
		//
		// (PUT) actions with participants
        this.routePUTRequests();
        //
        // (DELETE) actions with participants
        this.routeDELRequests();
        //
		//
		// PM Server
		//
		// Start gateway
		this.startServer(this.serverPort);
	}

	public getExpress(): any {
/*
		let _this = this;
		return this.server !== undefined ? this.server : _this.getExpressServer();
*/
        return this.expressApp;
	}

	public createSendPkg(res: any, code: any, result: any, err: any = undefined) {
		/* istanbul ignore next */
		if (err !== undefined || err !== null) {
			if (err.code === undefined) err['code'] = "NO_AUTH";
            if (err.msg === undefined) err['msg'] = "Not authorized";
            if (err.HTTP_code === undefined) err.HTTP_code = (code === undefined) ? HttpStatus.UNAUTHORIZED : code;
            code = err.HTTP_code;
		}

		res.status(code).send({
			result: result,
			error: err
		}).end();
	}


    /**
     * Check if user's sessionId is valid
     *
     * @param req
     * @param res
     * @param next
     * @param callback
     * @returns {*} callback() if success or error.
     */
    public checkAuth(req: any, res: any, next: any, callback: any) {
        let authObject = {};
        authObject !== undefined ? callback(authObject) : this.createSendPkg(res, HttpStatus.UNAUTHORIZED, undefined, { code: 'NO_AUTH' });
    };

    /**
     * Start TrackBox Server
     *
     * @param port
     */
	public startServer(port: number) {
		/*this.server = */this.server.listen(port, function () {
			global.tracer.log("Racer Streaming Server successfully loaded and running on port " + port);
		});

        // Sockets routing
        this.io.on('connect', (socket: any) => {
            console.log('Connected client on port %s.', port);
            socket.emit('ack', {Status: 200});

            socket.on('CH01', (from: any, m: Message) => {
                console.log('[server][CH01](message): %s', JSON.stringify(m));
                this.io.emit('message', m);
            });

            socket.on('message', (m: Message) => {
                console.log('[server](message): %s', JSON.stringify(m));
                this.io.emit('message', m);
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected');
            });
        });
	};

    /**
     *
     * POST Requests Routing
     *
     * /session
     *
     */
	public routePOSTRequests() {
        this.streamSessions.setupUserPostApi(this.expressApp);
	};

    /**
     *
     * PUT Requests Routing
     *
     * /api/tracks
     * /api/tracks/blob/:id
     *
     */
    public routePUTRequests() {
        this.streamSessions.setupUserPutApi(this.expressApp);
    };

    /**
     *
     * DELETE Requests Routing
     *
     * /
     * /api/tracks/:id - delete track id
     *
     */
    public routeDELRequests() {
        this.streamSessions.setupUserDelApi(this.expressApp);
    };

    /**
     *
     * GET Requests Routing
     *
     * /
     * /getstr - get string stored with putstr
     *
     */
	public routeGETRequests() {
        this.streamSessions.setupUserGetApi(this.expressApp);
    };

    public sendPkg(res: any, code: any, result: any, err: any) {
        this.createSendPkg(res, code, result, err);
    }


}

declare var module: any;
(module).exports = RacerStreamerServer;
