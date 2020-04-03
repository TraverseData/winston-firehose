"use strict";

const bluebird = require('bluebird');
const retry = require('bluebird-retry');
const AWS = require('aws-sdk');
AWS.config.setPromisesDependency(bluebird);


module.exports = class FirehoseWrapper {
  constructor(streamName, options) {
    this.streamName = streamName;
    this.firehose = new AWS.Firehose(options || {});
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
      return this.firehose.putRecord(params)
        .tapCatch(err => {
          console.log(err);
        });
    };

    return retry(_send, {max_tries: 4, backoff: 2})
    .catch(err => {
      console.log(`WinstonFirehose Error`, err);
    });
  }
};
