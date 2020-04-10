"use strict";

const expect = require('expect');
const sinon = require('sinon');
const bluebird = require('bluebird');

const FirehoseWrapper = require('../src/FirehoseWrapper.js');

describe('FirehoseWrapper', () =>{
  // not stubbing firehoseWrapper.putrecordpromise with sinon
  // because we are stubbing differently for each test

  it('calls firehose.putRecordPromise', () =>{
    // stub success
    let firehoseWrapper = new FirehoseWrapper('someStream', {region: 'us-east-1'});

    // expects a .promise method to be exposed on the AWS API
    sinon.stub(firehoseWrapper.firehose, 'putRecordPromise').usingPromise(bluebird).resolves();
    return firehoseWrapper.send('{"timestamp":"2020-04-02T05:17:06.330Z","meta":{"meta":"attributes"},"foo":"bar","level":"info"}')
    .then(() => {
      // should be called once if the request is successful
      sinon.assert.calledOnce(firehoseWrapper.firehose.putRecordPromise);
      firehoseWrapper.firehose.putRecordPromise.restore();
    });
  });

  it('retries if the putRecordPromise fails with rejection', () => {
    // stub failure
    let firehoseWrapper = new FirehoseWrapper('someStream', {region: 'us-east-1'});
    sinon.stub(firehoseWrapper.firehose, 'putRecordPromise').usingPromise(bluebird).rejects();
    return firehoseWrapper.send('{"timestamp":"2020-04-02T05:17:06.330Z","meta":{"meta":"attributes"},"foo":"bar","level":"info"}')
    .then(() => {
      // should be called 4x if the request fails continuously
      sinon.assert.callCount(firehoseWrapper.firehose.putRecordPromise, 4)
      firehoseWrapper.firehose.putRecordPromise.restore();
    });
  })
  .timeout(8000); // 4 requests with 2x backoff, 1000ms first backoff, should take 7 seconds

  it('retries differently if retry config is set', () => {
    // stub failure
    let firehoseWrapper = new FirehoseWrapper('someStream', {region: 'us-east-1'}, {max_tries: 3, backoff: 1});
    sinon.stub(firehoseWrapper.firehose, 'putRecordPromise').usingPromise(bluebird).rejects();
    return firehoseWrapper.send('{"timestamp":"2020-04-02T05:17:06.330Z","meta":{"meta":"attributes"},"foo":"bar","level":"info"}')
    .then(() => {
      // should be called 3x if the request fails continuously
      sinon.assert.callCount(firehoseWrapper.firehose.putRecordPromise, 3)
      firehoseWrapper.firehose.putRecordPromise.restore();
    });
  })
  .timeout(3000); // 3 requests with 1x backoff, 1000ms first backoff, should take 2 seconds

});
