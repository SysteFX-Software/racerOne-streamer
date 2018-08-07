import { createServer, Server } from 'http';
import * as express from 'express';
import * as socketIo from 'socket.io-client';
let HttpStatus = require('http-status-codes');

import { Message } from '../../model';

export class StreamClient {
    public static readonly PORT:number = 8060;
    private app: express.Application;
    private port: string | number;

    constructor() {
        this.createApp();
        this.config();
        this.connect();
    }

    private createApp(): void {
        this.app = express();
    }

    private config(): void {
        this.port = process.env.PORT || StreamClient.PORT;
    }

    private connect(): void {
        let joinReq = {
            force_create_session: false,
            session: {
                track_id: 'VT2018:001:80f8d006-df86-4767-ae0a-b35e60cabda3:1520414422944',
                customer_id: 'BT2014:002:9acf38f6-d3c8-4429-a010-ed73088afbbd:1518437910234',
                device_id: 'DEV12345',
                name: 'Test session 01',

            }
        }

        console.log('Connecting client on port %s.', this.port);
        let socket = socketIo.connect('http://localhost:'+this.port+'/strm', {reconnect: true});

        // Add a connect listener
        socket.on('connect', function (s) {
            socket.emit('syn', JSON.stringify(joinReq));
        });

        socket.on('syn-ack', (m: any) => {
            // safe to start streaming
            socket.emit('traq-evt', "traqued event data");
        });

        socket.on('syn-nack', (m: any) => {
            socket.disconnect();
        });

        socket.on('traq-evt', function(m: any) {
            console.log('traq-evt(client): ' + m);
        });

        socket.on('disconnect', () => {
        });
    }

    public getApp(): express.Application {
        return this.app;
    }
}
