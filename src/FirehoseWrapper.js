"use strict";

const bluebird = require('bluebird');
const retry = require('bluebird-retry');
const HttpsAgent = require('agentkeepalive').HttpsAgent;
const AWS = require('aws-sdk');
AWS.config.setPromisesDependency(Promise);

const keepaliveAgent = new HttpsAgent({
  maxSockets: 10,
  maxFreeSockets: 10,
  timeout: 60000, // active socket keepalive for 60 seconds
  freeSocketTimeout: 30000, // free socket keepalive for 30 seconds
});

module.exports = class FirehoseWrapper {
  constructor(streamName, firehoseOptions, retryConfig) {
    this.streamName = streamName;
    this._defaults = {httpOptions: {agent: keepaliveAgent}};
    this.firehose = new AWS.Firehose(Object.assign({}, this._defaults, firehoseOptions, retryConfig));
    this.firehose.putRecordPromise = bluebird.promisify(this.firehose.putRecord);
    this.retryConfig = Object.assign({max_tries: 4, backoff: 2}, retryConfig);
  }

  /**
   * @returns Promise
   */
  send(message) {
    const params = {
      DeliveryStreamName: this.streamName,
      Record: {
        Data: message + '\n',
      }
    };

    const _send = () => { // relies on scoped params because retry cannot pass arguments
      return this.firehose.putRecordPromise(params);
    };

    return retry(_send, this.retryConfig)
    .catch(err => {
      console.log(`WinstonFirehose Error in FirehoseWrapper.send`, err);
    });
  }
};
