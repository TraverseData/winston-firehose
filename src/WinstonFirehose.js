const Transport = require('winston-transport');
const FirehoseWrapper = require('./FirehoseWrapper.js');

const WinstonFirehose = class WinstonFirehose extends Transport {
  constructor(options) {
    super(options);
    // Transport Name
    this.name = options.name || 'WinstonFirehose';

    // Log Level
    this.level = options.level || 'info';

    // Attributes to be included at the root of the firehosed object. Everything else goes under the "meta" object attribute.
    this.topLevelAttributes = options.topLevelAttributes || ['level', 'message', 'timestamp']; // todo: should level and message always be here?

    // Allows for the same attribute to be logged with each message for a particular instance of the logger, i.e. application name or version
    this.constants = options.constants || {};
    this.formatter = options.formatter || JSON.stringify;

    const streamName = options.streamName;
    const firehoseConfig = options.firehoseConfig || {};
    // todo: throw error if streamName, firehoseConfig aren't defined
    const retryConfig = options.retryConfig || {};
    this.firehoseWrapper = new FirehoseWrapper(streamName, firehoseConfig, retryConfig);
  }

  log(level, msg, meta, callback) {
    if (this.silent) {
      return callback(null, true);
    }
    setImmediate(() => this.emit('logged')); // winston wants this
    const log = this._formatLogObject(level, msg, meta);
    return this.firehoseWrapper.send(log)
    .then(() => {
      if (callback) return callback();
    });
  }

  _formatLogObject(level, message, meta){
    // gather up everything into one single object. constants overwrite everything.
    let logObject = Object.assign({ timestamp: (new Date()).toISOString() }, meta, {level, message}, this.constants);

    // Ensure the log transport was properly passed the metadata as an object.
    // First, check for weird types that might get passed in.
    if (logObject.meta !== undefined && logObject.meta !== null
      && (logObject.meta.length !== undefined || typeof logObject.meta !== 'object')) {
      let metaValue = logObject.meta;
      logObject.meta = {meta: metaValue};
    } else if (!logObject.meta) { // All "surprise" falsy values should have already been caught, so we can be loose here
      logObject.meta = {};
    }

    // assign top level attributes at top level of log object, everything else goes under the "meta" attribute
    const keys = Object.keys(logObject);
    keys.forEach(key => {
      if (this.topLevelAttributes.indexOf(key) === -1 && key !== 'meta'){
        logObject.meta[key] = logObject[key];
        delete logObject[key];
      }
    });
    return this.formatter(logObject);
  }
}

module.exports = WinstonFirehose;
