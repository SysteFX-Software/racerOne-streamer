/**
 * Created by Tomcat  on 31/07/18.
 *
 */

import {RacerStreamerServer} from "./streamServer";
import {SocketConnector} from "./SocketConnector";

export enum StreamSessionState {
    DATA_VALID = 1,
    DATA_NO_DATA,
    DATA_WRONG_ID,
    DATA_WRONG_TRACK_ID,
    DATA_WRONG_CUSTOMER_ID,
    DATA_WRONG_TIME,
    DATA_WRONG_DURATION,
    STREAMING_SCHEDULED,
    STREAMING_RUNNING,
    STREAMING_FINISHED,
    STREAMING_RESET,
    STREAMING_ABORTED
}

export class StreamSession {

    id: string;
    track_id: string;
    customer_id: string;
    device_id: string;
    name: string;
    tag: string;
    start_time: Date;
    stop_time: Date;
    total_time: number;

    private clients: any = {};


    // IValidated
    isDataValid = false;

    private state: StreamSessionState = StreamSessionState.DATA_NO_DATA;

    private static zeroDate: Date = new Date(0);

    // create from http request object or another json
    constructor(data?: any) {
        if (!data) {
            return;
        }

        this.updateFromData(data);

        this.isDataValid = StreamSession.validateParams(this);
    }

    public addClient(client: SocketConnector): boolean {
        if(this.clients[client.getClientId()] === undefined) {
            this.clients[client.getClientId()] = client;
            return true;
        }

        return false;
    }

    public removeClient(client: SocketConnector): boolean {
        if(this.clients[client.getClientId()] === undefined) {
            delete this.clients[client.getClientId()];
            return true;
        }

        return false;
    }

    public isValid(): boolean {
        return this.isDataValid;
    }

    public getState() {
        return this.state;
    }

    public getStateText() {
        switch(this.state) {
            case StreamSessionState.DATA_VALID: return "VALID";
            case StreamSessionState.DATA_NO_DATA: return "NO_DATA";
            case StreamSessionState.DATA_WRONG_ID: return "WRONG_ID";
            case StreamSessionState.DATA_WRONG_CUSTOMER_ID: return "WRONG_CUSTOMER_ID";
            case StreamSessionState.DATA_WRONG_TIME: return "WRONG_TIME";
        }
    }

    public clientFriendly() {
        return  {   id:             this.id,
                    track_id:       this.track_id,
                    customer_id:    this.customer_id,
                    device_id:      this.device_id,
                    name:           this.name,
                    tag:            this.tag,
                    start_time:     this.start_time,
                    stop_time:      this.stop_time,
                    total_time:     this.total_time }
    }

    public static validateId(id: string): boolean {
        if (!id) return false;

        return true;
    }

    public static validateTrackId(id: string): boolean {
        if ( !id || id === "" ) {
            return false;
        }

        return true;
    }

    public static validateCustomerId(id: string): boolean {
        if ( !id || id === "" ) return false;

        return true;
    }

    public static validateParams(track: StreamSession): boolean {
        if(StreamSession.validateId(track.id) && StreamSession.validateTrackId(track.track_id) && StreamSession.validateCustomerId(track.customer_id)) {
            track.state = StreamSessionState.DATA_VALID;
            return true;
        }

        track.state = StreamSessionState.DATA_NO_DATA;
        return false;
    }

    /**
     *
     * @param {string} original
     * @param {number} type
     */
    static generateId(original?: string, type?: number) {
        return 'SS2018' + new Date().getTime().toString();
    }

    public update(sessionData: any, callback: any) {
        this.updateFromData(sessionData);

        callback(true, null);
    }

    private updateFromData(data: any) {
        if(data) {
            this.id                     = !(data.id)? StreamSession.generateId() :data.id;
            this.track_id               = !(data.track_id) ? "" : data.track_id;
            this.customer_id            = !(data.customer_id) ? "" : data.customer_id;
            this.device_id              = !(data.device_id) ? "" : data.device_id;
            this.name                   = !(data.name) ? "" : data.name;
            this.tag                    = !(data.tag) ? "" : data.tag;
            this.start_time             = !(data.start_time) ? "" : data.start_time;
            this.stop_time              = !(data.stop_time) ? "" : data.stop_time;
            this.total_time             = !(data.total_time) ? 0 : Number(data.total_time);
        }
    }
}
//
// declare var module: any;
// (module).exports = StreamSession;
