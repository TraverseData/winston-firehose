"use strict";

const bluebird = require('bluebird');
const retry = require('bluebird-retry');
const AWS = require('aws-sdk');
AWS.config.setPromisesDependency(Promise);

module.exports = class FirehoseWrapper {
  constructor(streamName, options) {
    this.streamName = streamName;
    this.firehose = new AWS.Firehose(options);
    this.firehose.putRecordPromise = bluebird.promisify(this.firehose.putRecord);
  }

  /**
   * @returns Promise
   */
  send(message) {
    const params = {
      DeliveryStreamName: this.streamName,
      Record: {
        Data: message,
      }
    };

    const _send = () => { // relies on scoped params because retry cannot pass arguments
      // return this.firehose.putRecord(params);
      return this.firehose.putRecordPromise(params);
    };

    return _send();

    // return retry(_send, {max_tries: 1, backoff: 2})
    // .catch(err => {
    //   console.log(`WinstonFirehose Error`, err);
    // });
  }
};
