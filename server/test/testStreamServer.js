/**
 * Created by viktorkorotya on 01/12/17.
 */
const RacerStreamerServer = require("../src/streamServer");
const StreamSession = require("../src/streamSession");

let fs = require('fs');

const request = require('supertest');
const expect = require('chai').expect;
const assert = require('chai').assert;

const config = require( '../config' );

// Set UTC time
// Is highly unreliable acc. to StackExchange
//process.env.TZ = "Europe/London";

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
    }
});

(function () {
    let testService = undefined;
    let connection = undefined;

    before(function(done){
        testService = new RacerStreamerServer(config.ports.service);
        done();
    });

    after(function(done) {
        console.log("Streamer TEST ENDED");
        done();
    });

    const testTrackId1      = 'VT2018:001:80f8d006-df86-4767-ae0a-b35e60cabda3:1520414422944';
    const invalidCustomerID = 'BT2014:004:9acf38f6-d3c8-4429-a010-ed73088afbd:0';

    let testSession/*: StreamSession*/ = {
        id: '',
        track_id: testTrackId1,
        customer_id: 'BT2014:002:9acf38f6-d3c8-4429-a010-ed73088afbbd:1518437910234',
        device_id: 'DEV12345',
        name: 'Test session 01',
        tag: '#traqued,#test_session_01',
        start_time: '2017-12-10 18:16:01',
        stop_time: '2017-12-10 20:59:03',
        total_time: 0
    };

    describe('Streamer REST functions -', function () {
        testSession.total_time = (new Date(testSession.stop_time)).getTime() - (new Date(testSession.start_time)).getTime();
        testSession.moving_time = testSession.total_time - 1000;

        it('Create session', function (done) {
            let testInvalidSession = Object.assign({}, testSession);

            request(testService.getExpress())
                .post('/scp/session')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({
                    session: testSession
                })
                .expect('Content-Type', /json/)
                .expect(200)
                .end(/*function (err, res) {
                    if (err) return done(err);

                    done();
                }*/done);
        });

        // Modify session parameters
        let testSessionUpdatedParameters = Object.assign({}, testSession);
        it('Update session parameters', function (done) {

            this.timeout(20000);

            // Make new track parameters
            testSessionUpdatedParameters.name = 'Test track 01 (updated)';
            testSessionUpdatedParameters.tag += ',#updated';
            testSessionUpdatedParameters.start_time = '2017-12-13 08:15:31';
            testSessionUpdatedParameters.stop_time = '2017-12-13 10:59:23';

            testSessionUpdatedParameters.total_time = (new Date(testSessionUpdatedParameters.stop_time)).getTime() - (new Date(testSessionUpdatedParameters.start_time)).getTime();
            testSessionUpdatedParameters.moving_time = testSessionUpdatedParameters.total_time - 1200;

            request(testService.getExpress())
                .put('/scp/session')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({
                    session: testSessionUpdatedParameters
                })
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err);

                    done();
                });
        });

        it('Get session parameters', function (done) {
            this.timeout(20000);

            request(testService.getExpress())
                .get('/scp/session/' + testSessionUpdatedParameters.id)
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err);

                    done();
                });
        });

        it('Get sessions', function (done) {
            this.timeout(20000);

            request(testService.getExpress())
                .get('/scp/sessions')
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err);

                    done();
                });
        });

        it('Delete session', function (done) {
            this.timeout(100000);

            request(testService.getExpress())
                .delete('/api/session/' + testSession.id)
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send()
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log("ERROR: " + err); return done(err);
                    }
                    done();
                });
        });
    });
})();