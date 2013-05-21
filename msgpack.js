var MuxDemux = require('mux-demux/msgpack')
module.exports = {
  client : require('./lib/client')(MuxDemux),
  server : require('./lib/server')(MuxDemux)
}
