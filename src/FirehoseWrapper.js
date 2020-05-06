"use strict";

const bluebird = require('bluebird');
const retry = require('bluebird-retry');
const AWS = require('aws-sdk');
AWS.config.setPromisesDependency(Promise);

module.exports = class FirehoseWrapper {
  constructor(streamName, firehoseOptions, retryConfig) {
    this.streamName = streamName;
    this.firehose = new AWS.Firehose(firehoseOptions, retryConfig);
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
