const Transport = require('winston-transport');
const FirehoseWrapper = require('./FirehoseWrapper.js');

const WinstonFirehose = class WinstonFirehose extends Transport {
  constructor(options) {
    super(options);
    this.name = options.name || 'WinstonFirehose';
    this.level = options.level || 'info';
    this.topLevelAttributes = options.topLevelAttributes || ['message', 'timestamp']; // todo: should level and message always be here?
    this.formatter = options.formatter || JSON.stringify;

    const streamName = options.streamName;
    const firehoseConfig = options.firehoseConfig || {};
    this.firehoseWrapper = new FirehoseWrapper(streamName, firehoseConfig);
  }

  log(level, msg, meta, callback) {
    if (this.silent) {
      return callback(null, true);
    }
    setImmediate(() => this.emit('logged'));
    const log = this._formatLogObject(level, msg, meta);
    console.log(log);
    return this.firehoseWrapper.send(log)
    .then(() => {
      if (callback) return callback();
    });
  }

  _formatLogObject(level, message, meta){
    let logObject = Object.assign({ timestamp: (new Date()).toISOString() }, meta, {level, message});

    // Ensure the log object has a meta property that is an actual object.
    // First, check for weird types that might get passed in.
    if (logObject.meta !== undefined && logObject.meta !== null
      && (logObject.meta.length !== undefined || typeof logObject.meta !== 'object')) {
      let metaValue = logObject.meta;
      logObject.meta = {meta: metaValue};
    } else if (!logObject.meta) { // All "surprise" falsy values should have already been caught
      logObject.meta = {};
    }

    const keys = Object.keys(logObject);

    keys.forEach(key => {
      if (this.topLevelAttributes.indexOf(key) === -1 && key !== 'meta'){
        logObject.meta[key] = logObject.key;
        delete logObject[key];
      }
    });
    return this.formatter(logObject);
  }
}

module.exports = WinstonFirehose;
