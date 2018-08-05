/**
 * Created by Tomcat  on 05/07/18.
 *
 */
import * as socketIo from 'socket.io';
import {Message} from "../../model";

let StreamSessionManager = require('./streamSessionManager'); // singleton class
let HttpStatus = require('http-status-codes');

export class SocketConnector {

    private socket: SocketIO.Socket;
    private ioNamespace: SocketIO.Namespace;

    // create from http request object or another json
    constructor(socket: SocketIO.Socket, namespace: SocketIO.Namespace) {
        if (!socket) {
            return;
        }

        this.socket = socket;
        this.ioNamespace = namespace;
    }

    public initialize() {
        let __this = this;
        this.socket.on('syn', function(m: any) {
            let req = JSON.parse(m);
            if(req.session_id !== 'SSTEST') {
                __this.socket.emit('syn-ack', {status: HttpStatus.FORBIDDEN});
            }
            else {
                __this.socket.emit('syn-ack', {status: HttpStatus.OK});
            }
        });

        this.socket.on('message', (m: Message) => {
            console.log('[server](message): %s', JSON.stringify(m));
            this.ioNamespace.emit('message', m);
        });

        this.socket.on('disconnect', () => {
            console.log('Client disconnected');
        });

    }
}
