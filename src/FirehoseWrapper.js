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

    const _send = (params) => {
      return this.firehose.putRecord(params).promise();
    };

    return retry(_send(params), { max_tries: 4, backoff: 2);
  }
};
