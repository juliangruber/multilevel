var fs = require('fs');
var createManifest = require('level-manifest');

module.exports = writeManifest;

function writeManifest (db, path) {
  var manifest = createManifest(db, true /* terse mode */);
  fs.writeFileSync(path, JSON.stringify(manifest));
  return manifest;
}
