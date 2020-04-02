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
            topLevelAttributes: ['message', 'method', 'creationtimestamp']
          }),
          new (WinstonFirehose)({
            level: "verbose",
            name: 'VerboseWinstonFirehose',
            sendLog: log => console.log(log),
            topLevelAttributes: ['someother', 'method', 'creationtimestamp']
          })
        ]
      });
      expect(logger.transports.WinstonFirehose).not.toEqual(undefined);
    });
  });


  describe('logging messages', () => {
    beforeEach(() => {
      // sinon.stub(lib, 'whatever')
      sinon.stub(FirehoseWrapper.prototype, 'send').usingPromise(Promise).resolves();
    });

    afterEach(() => {
      // lib.whatever.restore();
      FirehoseWrapper.prototype.send.restore();
    });

    it('logs in the proper format', () =>{
      const transport = new WinstonFirehose({
        level: "verbose",
        name: 'VerboseWinstonFirehose',
        streamName: 'someStream',
        firehoseOptions: {region: 'us-east-1'},
        topLevelAttributes: ['level', 'method', 'timestamp', 'foo']
      });
      transport.log('info', 'message', {something: 'attributes', foo: 'bar'});
    });

    it('logs in the proper format even if a reserved word is accidentally used', () =>{
      const transport = new WinstonFirehose({
        level: "verbose",
        name: 'VerboseWinstonFirehose',
        streamName: 'someStream',
        firehoseOptions: {region: 'us-east-1'},
        topLevelAttributes: ['level', 'method', 'timestamp', 'foo']
      });
      transport.log('info', 'message', {meta: 'attributes', foo: 'bar'});
    });

  });
});
