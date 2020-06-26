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
    this.formatter = options.formatter || this._defaultFormatter;

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

  /**
   * default formatter for this log transport,
   * @param  {[type]} logObject [description]
   * @return {[type]}           [description]
   */
  _defaultFormatter(logObject){
    // c.f. MSDN for handling circular references https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value#Examples
    const getCircularReplacer = () => {
      const seen = new WeakSet();
      return (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      };
    };

    return JSON.stringify(logObject, getCircularReplacer());
  }

  /**
   * Formats all available log details into a log object by assigning
   *
   * @throws {TypeError}  When using JSON.stringify as the formatter and passed an object with a circular reference
   *
   * @param  {[type]} level   [description]
   * @param  {[type]} message [description]
   * @param  {[type]} meta    [description]
   * @return {[type]}         [description]
   */
  _formatLogObject(level, message, meta){
    // gather up everything into one single object. constants overwrite everything.
    let logObject = Object.assign({ timestamp: (new Date()).toISOString() }, meta, {level, message}, this.constants);

    // Set up the meta attribute for population
    if (logObject.meta !== undefined) {
      logObject.meta = Object.assign({}, {meta: logObject.meta});
    } else {
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
};

module.exports = WinstonFirehose;