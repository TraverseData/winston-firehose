"use strict";

const expect = require('expect');
const sinon = require('sinon');

const FirehoseWrapper = require('../src/FirehoseWrapper.js');

describe('FirehoseWrapper', () =>{
    beforeEach(() => {
      // sinon.stub(lib, 'whatever')
      // sinon.stub(FirehoseWrapper.prototype, 'send').usingPromise(Promise).resolves();
      // todo: stub firehose putrecord
    });

    afterEach(() => {
      // lib.whatever.restore();
      //FirehoseWrapper.prototype.send.restore();
    });

    it('calls firehose.putRecord', () =>{
      // stub success
      // count how many times
    });

    it('retries if the putRecord fails with rejection', () => {
      // stub failure
      // count how many times
    });
});
