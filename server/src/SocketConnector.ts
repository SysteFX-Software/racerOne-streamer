/**
 * Created by Tomcat  on 05/07/18.
 *
 */
import * as socketIo from 'socket.io';
import {Message} from "../../model";
import {StreamSession} from "./StreamSession";

const StreamSessionManager = require('./StreamSessionManager'); // singleton class

let HttpStatus = require('http-status-codes');

export class SocketConnector {

    private socket: SocketIO.Socket;
    private ioNamespace: SocketIO.Namespace;
    private id: string;
    private session: StreamSession;

    // create from http request object or another json
    constructor(socket: SocketIO.Socket, namespace: SocketIO.Namespace) {
        if (!socket) {
            return;
        }

        this.socket = socket;
        this.ioNamespace = namespace;
    }

    public initialize(): boolean {
        let __this = this;

        // setup message routing
        // conection handshake and streaming session join
        this.socket.on('syn', function(m: any) {
            let joinReq = JSON.parse(m);

            StreamSessionManager.getInstance().addClientToSession(__this, joinReq, function(joinedSession: StreamSession, err: any) {
                if (joinedSession) {
                    console.log('socket.on(syn): sending syn-ack-OK');
                    __this.session = joinedSession;

                    if(!joinReq.master) {
                        __this.joinSessionChannel(joinedSession.id);
                    }

                    __this.socket.emit('syn-ack', { status: HttpStatus.OK, session_id: joinedSession.id });
                }
                else if(err) {
                    console.log('socket.on(syn): sending syn-nack-status: '+err.code);
                    __this.socket.emit('syn-nack', {status: err.code});
                }
            });
        });

        // track data observer
        this.socket.on('traq-evt', function(m: any) {
            console.log('traq-evt(server): ' + m);
            __this.socket.to(__this.session.id).emit('traq-evt', m);
        });

        // graceful disconnect
        this.socket.on('disconnect', function(m: any) {
            console.log('client disconnected from server');
            if(__this.session) {
                __this.session.removeClient(__this);
            }
        });

        return true;
    }

    public getClientId() : string {
        return this.id;
    }

    public joinSessionChannel(sessionId: string) {
        this.socket.join(sessionId);
    }
}
