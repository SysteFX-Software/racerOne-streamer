/**
 * Created by Tomcat on 31/07/18.
 *
 * Implements tracks box track management
 */

import * as HttpStatus from "http-status-codes";

import { StreamSession } from './streamSession';


declare function require(name: string): any;
declare let global: any;
if (global.config === undefined) global.config = require( '../config' );

export class StreamSessions {

    protected sessions: any = {};

    constructor() {
    }

    // public updateData
    // public updateBody
    // public find
    // public getData
    // public getBody
    // public delete

    //
    // CRUD operations
    //
    public create(sessionData: any, callback: any) {
        let _this = this;

        // unescape data
        Object.keys(sessionData).forEach(function (name) {
            sessionData[name] = decodeURI(sessionData[name]);
        });

        this.addSession(sessionData, callback);
    }

    public read(sessionData: any, callback: any) {
        // unescape data
        Object.keys(sessionData).forEach(function (name) {
            sessionData[name] = decodeURI(sessionData[name]);
        });

        let session = this.getSession(sessionData.id);
        if (session) {
            this.getData(session, callback);
        }
        else {
            return callback(0, { code: 'ER_SESSION_NOT_FOUND', sub_code: ''/*raceTrack.getStateText()*/,
                HTTP_code: HttpStatus.NOT_FOUND, msg: "Track data state: " + ''/*raceTrack.getStateText()*/ });
        }
    }

    public update(sessionData: any, callback: any) {
        // unescape data
        Object.keys(sessionData).forEach(function (name) {
            sessionData[name] = decodeURI(sessionData[name]);
        });

        let session: StreamSession = this.getSession(sessionData.id);
        if (StreamSession.validateId(sessionData.id) ) {
            this.updateData(session, sessionData, callback);
        }
        else {
            return callback(0, { code: 'ER_SESSION_NOT_FOUND', sub_code: ''/*raceTrack.getStateText()*/,
                HTTP_code: HttpStatus.NOT_FOUND, msg: "Track data state: " + ''/*raceTrack.getStateText()*/ });
        }
    }

    /**
     * Delete session
     * @param id
     * @param callback
     */
    public delete(sessionId: string, callback: any) {
        if(this._del(sessionId)) {
            return callback(true, null);
        }
        else {
            return callback(false, { code: 'ER_SESSION_NOT_FOUND', sub_code: sessionId,
                HTTP_code: HttpStatus.NOT_FOUND, msg: "Session ID not found" });
        }
    }

    //
    // Session manipulation
    //
    protected addSession(sessionData: any, callback: any) {
        let _this = this;

        let session = new StreamSession(sessionData);
        if (session && session.isValid()) {
            if(this._add(session.id, session)) {
                callback(session.id, undefined);
            }
            else {
                callback(null, { code: 'ER_SESSION_NOT_FOUND',
                    HTTP_code: HttpStatus.NOT_FOUND, msg: "Session ID not found" });
            }
        }
        else {
            return callback(0, { code: 'ER_WRONG_DATA', sub_code: session.id,
                HTTP_code: HttpStatus.BAD_REQUEST, msg: "Session data are invalid" });
        }
    }

    /**
     * Get Session data
     * @param id
     * @param callback
     */
    public getData(session: StreamSession, callback: any) {
        if (session) {
            callback(session, undefined);
        }
        else {
            callback(false, true);
        }
    }

    /**
     * Performs update queries.
     * @param track
     * @param callback
     */
    protected updateData(session: StreamSession, sessionData: any, callback: any) {
        if (!sessionData || sessionData.id === undefined || sessionData.id == '') {
            return callback(0, { code: 'ER_NO_DEFAULT_FOR_FIELD' });
        }
        else {
            session.update(sessionData, function (result: any, err: any) {
                callback(result, err);
            });
        }
    }

    public getSession(sessionId: string): StreamSession {
        return this._get(sessionId);
    }

    public getSessions(): string[] {
        let sessions: string[] = [];
        for(let sid in this.sessions) {
            let session: StreamSession = this.sessions[sid];
            sessions.push(session.id)
        }

        return sessions;
    }

    /**
     * Add session object to cache
     * @param session
     * @param sessionObject
     */
    private _add(session:string, sessionObject: StreamSession): boolean {
        if(this.sessions[session] === undefined) {
            this.sessions[session] = sessionObject;
            return true;
        }
        else {
            return false;
        }
    }


    /**
     * Delete session object from session
     * @param session
     * @returns {number}
     */
    private _get(session:string) {
        if(this.sessions[session] !== undefined) {
            return this.sessions[session];
        }

        return undefined;
    }

    /**
     * Delete session object from session
     * @param session
     * @returns {number}
     */
    private _del(session:string) {
        if(this.sessions[session] !== undefined){
            const streamSession: StreamSession = this.sessions[session];

            delete this.sessions[session];
            return true;
        }

        return false;
    }
}