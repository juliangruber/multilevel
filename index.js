var MuxDemux = require('mux-demux/jsonb');

module.exports = {
  client: require('./lib/client')(MuxDemux),
  server: require('./lib/server')(MuxDemux),
  writeManifest: require('./lib/write-manifest')
};
