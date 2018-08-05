
import {StreamSession} from './streamSession';
import {StreamSessions} from './streamSessions';

import * as HttpStatus from 'http-status-codes';


declare function require(name: string): any;
let request = require('request');
const querystring = require('querystring');

declare let global:any;

export class StreamSessionManager {

    private static _instance:StreamSessionManager = new StreamSessionManager();

    server          :any;

    sessions        :StreamSessions;
    serviceId       :string;

    sessionValidTime    :number = 60;
    cache:any = {};

    /* istanbul ignore next */
    protected constructor()
    {
        if(StreamSessionManager._instance){
            throw new Error("Error: Instantiation failed: Use Sessions.getInstance() instead of new.");
        }

        StreamSessionManager._instance = this;
    }

    /* istanbul ignore next */
    public static getInstance():StreamSessionManager
    {
        return StreamSessionManager._instance;
    }

    /**
     * Initialize SessionsCache with dbDriver and start crontab
     * @param dbDriver
     */
    /* istanbul ignore next */
    public init(server: any, bScheduleSessionExpirationCheck:boolean = true, serviceId? :string)
    {
        this.sessions = new StreamSessions();
        this.serviceId = serviceId;
        this.server = server;

        let _this = this;

        if(bScheduleSessionExpirationCheck) {
            // Run job every minute starting 59 seconds after gateway is up
            // '*/3 * * * * *' == every 3 seconds (for testing purposes)
            /*
                        _schedule.scheduleJob('*!/3 * * * * *', function () {
                            _this._checkForExpiredSessions();
                        });
            */
        }
    }

    public createSession(sessionData: any, callback: any) {
        this.sessions.create(sessionData, (session: string, err) => {
            callback(session, err);
        })
    }

    public getSessionData(sessionId: string, callback: any) {
        let session = this.getSession(sessionId);
        if(session) {
            callback(session.clientFriendly(), undefined);
        }
        else {
            callback(null, true);
        }
    }

    public getSessions(callback: any) {
        let sessions = this.getSessionsList();
        if(sessions) {
            callback(sessions, undefined);
        }
        else {
            callback(null, true);
        }
    }

    /**
     * @param sessionId
     * @returns {boolean} TRUE (sessionId exists), FALSE (sessionId not found)
     */
    public getSession(sessionId: string): StreamSession {
        return this.sessions.getSession(sessionId);
    };

    public getSessionsList(): string[] {
        return this.sessions.getSessions();
    }

    public removeSession(sessionId: string, callback: any) {
        return this.sessions.delete(sessionId, callback);
    }

    public checkAuth(req: any, res: any, next: any, callback: any) {
        let session_id: number = req.query['sid'];
        if (!session_id) {
            session_id = req.headers['authorization'];
        }

        const authObject = { authenticated: true };
        if(authObject) {
            return callback(authObject);
        }  else {
            return this.server.sendPkg(res, HttpStatus.UNAUTHORIZED, undefined, { code: 'NO_AUTH' });
        }
    };

    // Routing
    public setupUserGetApi(express: any) {
        const _this = this;

        /**
         * get track metadata
         *
         * /api/tracks/meta/:key?
         *
         * key=[string key used in /putstr]
         *
         * result: track metadata
         */
        express.get("/scp/session/:id", function (req: any, res: any, next: any) {
            global.tracer.log('StreamerServer, GET meta');
            _this.checkAuth(req, res, next, function (authObject?: any) {
                let sessionId: string = req.params['id'];
                _this.getSessionData(sessionId, function (result: any, err: any) {
                    if (!err) {
                        _this.server.createSendPkg(res, HttpStatus.OK, result);
                        next();
                    }
                    else {
                        _this.server.createSendPkg(res, HttpStatus.NOT_FOUND, null, err);
                    }
                });
            });
        });

        express.get("/scp/sessions", function (req: any, res: any, next: any) {
            global.tracer.log('StreamerServer, GET meta');
            _this.checkAuth(req, res, next, function (authObject?: any) {
                _this.getSessions(function (result: any, err: any) {
                    if (!err) {
                        _this.server.createSendPkg(res, HttpStatus.OK, result);
                        next();
                    }
                    else {
                        _this.server.createSendPkg(res, HttpStatus.NOT_FOUND, null, err);
                    }
                });
            });
        });
    }

    public setupUserPostApi(express: any) {
        const _this = this;

        /**
         * register streaming session
         *
         * /scp/session
         * key=[track_id]
         *
         * result: null
         */
        express.post("/scp/session", function (req: any, res: any, next: any) {
            // let requestData = ver.parseTrackBoxDataParameters(req.body);
            global.tracer.log('StreamerServer, POST session');

            _this.checkAuth(req, res, next, function (authObject? : any) {
                if(authObject) {
                    _this.createSession(req.body.session, function (result: any, err: any) {
                        if (!err) {
                            _this.server.createSendPkg(res, HttpStatus.OK, { sessionID: result } );
                            next();
                        }
                        else {
                            global.tracer.log('/scp/session - createSession FAILED!')

                            if (err.code === 'ER_DUP_ENTRY') {
                                err.HTTP_code = HttpStatus.CONFLICT;
                            }

                            _this.server.createSendPkg(res, err.HTTP_code, null, err);
                        }
                    });
                }
                else {
                    global.tracer.log('/scp/session - checkAuth FAILED!')
                }
            });
        });
    }

    public setupUserPutApi(express: any) {
        const _this = this;

        /**
         * PUT request
         *
         * Update existing track meta parameters: name, tag
         * /api/tracks/

         * api_key = [string key used in /putstr]
         * track = { track_data }
         *
         * result: HTTP Status (200 - OK, 400 - invalid track id, 404 - track not found)
         */
        express.put('/scp/session', function (req: any, res: any, next: any) {
            global.tracer.log('StreamerServer, PUT session');
            const sessionData = req.body.session;

            _this.checkAuth(req, res, next, function (user: any) {
                _this.sessions.update(sessionData, function (result: string, err: any) {
                    if (!err) {
                        _this.server.createSendPkg(res, HttpStatus.OK, result);
                        next();
                    }
                    else {
                        _this.server.createSendPkg(res, null, null, err);
                    }
                });
            });
        });
    }

    public setupUserDelApi(express: any) {
        const _this = this;

        express.delete("/scp/session/:id", function (req: any, res: any, next: any) {
            global.tracer.log('UserManager, DELETE session');

            let sessionId = req.params['id'];
            _this.checkAuth(req, res, next, function (authObject: any) {

                if (authObject !== undefined) {
                    _this.removeSession(sessionId, (result: boolean, err: any) => {
                        if (result) {
                            _this.server.sendPkg(res, HttpStatus.OK, result, undefined);
                            next();
                        } else {
                            _this.server.sendPkg(res, HttpStatus.NOT_FOUND, null, err);
                        }
                    });
                }
                else {
                    _this.server.sendPkg(res, HttpStatus.UNAUTHORIZED, undefined, {code: 'NO_AUTH'});
                }
            })
        });
    }

    /**
     * Checks for expired sessions and, if any found, delete them from sessions array
     * @param maxSeconds
     * @returns {*} sessionId (expired session found) or 0 (no expired session found)
     */
    public _checkForExpiredSessions(maxSeconds:number = undefined)
    {
        let _this = this;

        if(maxSeconds === undefined) maxSeconds = this.sessionValidTime;

        for(let sessionId in this.cache)
        {
            if(this.cache.hasOwnProperty(sessionId))
            {
                let sessionObject = _this.cache[sessionId];
                let now = Math.round(new Date().getTime()/1000);

                //// commented out since no "heartbeat" to gateway required, send "/del" otherwise
                // if(userObject.id === 0)
                // {
                //     // gateway user with keep-alive endpoint - POST heartbeat to gateway
                //     var propertiesObject = { ss:sessionId };
                //
                //     request.post(userObject.name+"/heartbeat", { json: propertiesObject }, function(err:any, response:any, body:any)
                //     {
                //         if(err)
                //         {
                //             global.tracer.log("Keepalive request to "+userObject.name+" failed: "+err.msg);
                //         }
                //     });
                // }

                // Normal (logged-in User)
                if(sessionObject.lastActivity < (now - maxSeconds)){
                    global.tracer.log("Session expired for user #"+ sessionObject.session_id);

                    if(sessionObject.id === 0) {
                        // added through /regsession
                        let propertiesObject = {ss: sessionId, sid: this.serviceId};
                        request({url:sessionObject.name+"/logout", qs:propertiesObject}, function (err: any, response: any, body: any) {
                            if (err) {
                                global.tracer.log("Session delete request to " + sessionObject.name + " failed: " + err.msg);
                            }
                        });
                    }

                    return _this.removeSession(sessionId, function(res: any) {} );
                }
            }
        }
        return 0;
    };
}

declare let module: any;
(module).exports = StreamSessionManager;