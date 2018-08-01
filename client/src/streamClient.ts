import { createServer, Server } from 'http';
import * as express from 'express';
import * as socketIo from 'socket.io-client';

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
        console.log('Connecting client on port %s.', this.port);
        let socket = socketIo.connect('http://localhost:'+this.port, {reconnect: true});

        // Add a connect listener
        socket.on('connect', function (s) {
            console.log('Connected!');

            console.log('Emitting message');
            socket.emit('message', 'test msg');
        });

        socket.on('message', (m: Message) => {
            console.log('[server](message): %s', JSON.stringify(m));
        });

        socket.on('ack', (m: Message) => {
            console.log('[server](ack): %s', JSON.stringify(m));
        });
    }

    public getApp(): express.Application {
        return this.app;
    }
}
