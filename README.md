# Winston-Firehose
Firehose transport for Winston. Allows for customization such as specifying
which attributes passed to the logger are top level vs buried in the meta
attribute.

## Installation
As a "plugin," this package expects peer dependency of `winston@^2.0`. After
installing dependencies/dev dependencies with `npm install`, you should install
this directly (`npm install winston@^2.0`).

## Notes
- Failed logs are retried 4x with an exponential backoff.
- This will not be able to log its own errors to firehose.
