"use strict";

const expect = require('expect');
const sinon = require('sinon');
const bluebird = require('bluebird');

const FirehoseWrapper = require('../src/FirehoseWrapper.js');

describe('FirehoseWrapper', () =>{
    it('calls firehose.putRecord', () =>{
      // stub success
      let firehoseWrapper = new FirehoseWrapper('someStream', {region: 'us-east-1'});

      // expects a .promise method to be exposed on the AWS API
      sinon.stub(firehoseWrapper.firehose, 'putRecord').usingPromise(bluebird).resolves({promise:() => {}});
      return firehoseWrapper.send('{"timestamp":"2020-04-02T05:17:06.330Z","meta":{"meta":"attributes"},"foo":"bar","level":"info"}')
      .then(() => {
        // should be called once if the request is successful
        sinon.assert.calledOnce(firehoseWrapper.firehose.putRecord);
        firehoseWrapper.firehose.putRecord.restore();
      });
    });

    it('retries if the putRecord fails with rejection', () => {
      // stub failure
      let firehoseWrapper = new FirehoseWrapper('someStream', {region: 'us-east-1'});
      sinon.stub(firehoseWrapper.firehose, 'putRecord').usingPromise(bluebird).rejects({promise:() => {}});
      return firehoseWrapper.send('{"timestamp":"2020-04-02T05:17:06.330Z","meta":{"meta":"attributes"},"foo":"bar","level":"info"}')
      .then(() => {
        // should be called 4x if the request fails continuously
        sinon.assert.callCount(firehoseWrapper.firehose.putRecord, 4)
        firehoseWrapper.firehose.putRecord.restore();
      });
    })
    .timeout(8000); // 4 requests with 2x backoff, 1000ms first backoff, should take 7 seconds

    // todo: test setRetryConfig

});
