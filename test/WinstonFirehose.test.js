"use strict";

var winston = require('winston');
const expect = require('expect');
const sinon = require('sinon');

const WinstonFirehose = require('../index.js');
const FirehoseWrapper = require('../src/FirehoseWrapper.js');

describe('WinstonFirehose', () =>{
  describe ('attaching to Winston', () => {
    it('can be attached as a logger', () => {
      var logger = new (winston.Logger)({
        transports: [
          new (WinstonFirehose)({
            level: process.env.NODE_LOG_LEVEL || "verbose",
            sendLog: log => console.log(log),
            topLevelAttributes: ['message', 'method', 'creationtimestamp']
          })]
      });
      expect(logger.transports.WinstonFirehose).not.toEqual(undefined);
    });

    it('can be attached as a logger twice, using different names', () => {
      var logger = new (winston.Logger)({
        transports: [
          new (WinstonFirehose)({
            level: process.env.NODE_LOG_LEVEL || "verbose",
            sendLog: log => console.log(log),
            streamName: 'winston-firehose-test-stream',
            firehoseConfig: {region: 'us-east-1'},
            topLevelAttributes: ['message', 'method', 'creationtimestamp']
          }),
          new (WinstonFirehose)({
            level: "verbose",
            name: 'VerboseWinstonFirehose',
            streamName: 'winston-firehose-test-stream',
            firehoseConfig: {region: 'us-east-1'},
            sendLog: log => console.log(log),
            topLevelAttributes: ['someother', 'method', 'creationtimestamp']
          })
        ]
      });
      expect(logger.transports.WinstonFirehose).not.toEqual(undefined);
    });
  });


  describe('logging messages', () => {
    /**
     * check log string as prepared by transport and turn back into an object
     * @param  {WinstonTransport} transport log transport
     * @return {Object}           object of log data
     */
    let checkAndParseLogString = (transport) => {
      let logString = transport.firehoseWrapper.send.getCall(0).args[0];
      expect(typeof logString).toEqual('string');
      return JSON.parse(logString);
    };

    /**
     * expects timestamp, meta and level attributes
     * @param  {object} logData JSON parsed log string
     * @return {undefined}         none
     */
    let expectBasicLogAttributes = (logData) => {
      expect(logData.timestamp).not.toEqual(undefined);

      expect(logData.meta).not.toEqual(undefined);
      expect(typeof logData.meta).toEqual('object');

      expect(logData.level).not.toEqual(undefined);
      expect(typeof logData.level).toEqual('string');

      expect(logData.message).not.toEqual(undefined);
      expect(typeof logData.message).toEqual('string');
    };

    beforeEach(() => {
      // sinon.stub(lib, 'whatever')
      // stub the actual firehose send function so that we don't hit
      sinon.stub(FirehoseWrapper.prototype, 'send').usingPromise(Promise).resolves();
    });

    afterEach(() => {
      // lib.whatever.restore();
      // restore after each test to reset counts, calling params
      FirehoseWrapper.prototype.send.restore();
    });

    it('logs in the proper format by default', () =>{
      // set up log transport
      const transport = new WinstonFirehose({
        level: "verbose",
        name: 'VerboseWinstonFirehose',
        streamName: 'winston-firehose-test-stream',
        firehoseConfig: {region: 'us-east-1'},
      });
      // log a message
      transport.log('info', 'some message');

      // check how the message is being sent to firehose
      let logData = checkAndParseLogString(transport);
      expectBasicLogAttributes(logData);
    });

    it('properly assigns meta attributes', () =>{
      let something = 'someValue';
      let foo = 'bar';
      let req = {statusCode:400, params:'?foo=bar'};
      // set up log transport
      const transport = new WinstonFirehose({
        level: "verbose",
        name: 'VerboseWinstonFirehose',
        streamName: 'winston-firehose-test-stream',
        firehoseConfig: {region: 'us-east-1'},
        topLevelAttributes: ['message', 'level', 'method', 'timestamp', 'foo']
      });

      // log a message
      transport.log('info', 'some message', {something, foo, req});

      // check top level attributes
      let logData = checkAndParseLogString(transport);
      expectBasicLogAttributes(logData);

      expect(logData.foo).not.toEqual(undefined);
      expect(logData.foo).toEqual(foo);

      // check meta attributes
      expect(logData.meta.something).not.toEqual(undefined);
      expect(logData.meta.something).toEqual(something);

      expect(logData.meta.req).not.toEqual(undefined);
      expect(typeof logData.meta.req).toEqual('object');
      expect(logData.meta.req.statusCode).toEqual(req.statusCode);
      expect(logData.meta.req.params).toEqual(req.params);
    });

    it('logs in the proper format even if a reserved word is accidentally used', () =>{
      let metaAttribute = 'metaValue';
      let foo = 'bar';

      const transport = new WinstonFirehose({
        level: "verbose",
        name: 'VerboseWinstonFirehose',
        streamName: 'winston-firehose-test-stream',
        firehoseConfig: {region: 'us-east-1'},
        topLevelAttributes: ['message', 'level', 'method', 'timestamp', 'foo']
      });
      transport.log('info', 'message', {meta: metaAttribute, foo: foo});
      let logData = checkAndParseLogString(transport);

      // check that normal attributes are set properly
      expectBasicLogAttributes(logData);
      expect(logData.foo).not.toEqual(undefined);
      expect(logData.foo).toEqual(foo);

      // check that the meta attribute is properly nested
      expect(logData.meta).not.toEqual(undefined);
      expect(typeof logData.meta).toEqual('object');
      expect(logData.meta.meta).toEqual(metaAttribute);
    });

    it('logs with constants', () =>{
      let appVersion = '1.0.1';
      let appName = 'myApp';
      let someMeta = 'foobar';
      const transport = new WinstonFirehose({
        level: "verbose",
        name: 'VerboseWinstonFirehose',
        streamName: 'winston-firehose-test-stream',
        firehoseConfig: {region: 'us-east-1'},
        topLevelAttributes: ['message', 'level', 'method', 'timestamp', 'foo', 'app', 'version'],
        constants: {
          'app': appName,
          'version': appVersion,
          'someMeta': someMeta
        }
      });
      transport.log('info', 'message', {meta: 'attributes', foo: 'bar'});
      let logData = checkAndParseLogString(transport);
      expectBasicLogAttributes(logData);


      // constants at top level:
      expect(logData.app).not.toEqual(undefined);
      expect(logData.app).toEqual(appName);

      expect(logData.version).not.toEqual(undefined);
      expect(logData.version).toEqual(appVersion);

      // constants nested in "meta":
      expect(logData.someMeta).toEqual(undefined);
      expect(logData.meta.someMeta).not.toEqual(undefined);
      expect(logData.version).toEqual(appVersion);
    });
  });
});
