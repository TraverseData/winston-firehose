# Winston-Firehose
Firehose transport for Winston. Allows for customization such as specifying
which attributes passed to the logger are top level vs buried in the meta
attribute.

## Installation
As a "plugin," this package expects peer dependency of `winston@^2.0`. After
installing dependencies/dev dependencies with `npm install`, you should install
this directly (`npm install winston@^2.0`).

## Interface
level:
Log level. Expects a string.


topLevelAttributes:
Attributes to be included at the root of the firehosed object. Everything else goes under the "meta" object attribute. Expects a list.


constants:
Allow for the same attribute to be logged with each message for a particular instance of the logger, i.e. application name or version. Expects an object.

streamName:
Firehose stream to write to (just name)


firehoseConfig
Just needs region, in AWS SDK format. (i.e. {region: 'us-east-1'})

retryConfig:
How to attempt retiries. c.f. https://www.npmjs.com/package/bluebird-retry
i.e.

## Notes
- Failed logs are retried 4x with an exponential backoff.
- This will not be able to log its own errors to firehose.
- Expects to connect to firehose over HTTPS