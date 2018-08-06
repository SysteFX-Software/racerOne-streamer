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
            force_create_session: true,
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
            console.log('Connected!');

            console.log('Sending SYN');
            socket.emit('syn', JSON.stringify(joinReq));
        });

        socket.on('traq-evt', function(m: any) {
            console.log('traq-evt(client): ' + JSON.stringify(m));
        });

        socket.on('syn-ack', (m: any) => {
            console.log('[server](syn-ack): %s', JSON.stringify(m));
            if(m.status != HttpStatus.OK) {
                socket.disconnect();
            }
            else {
                socket.emit('traq-evt', JSON.stringify({message: "traqued event data"}));
            }
        });

        socket.on('disconnect', function(m: any) {
            console.log('server disconnected from client');
        });
        // socket.on('disconnect', () => {
        //     console.log('Disconnected!');
        // });
    }

    public getApp(): express.Application {
        return this.app;
    }
}
