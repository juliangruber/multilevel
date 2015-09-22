var test = require('tape');
var writeManifest = require('../..').writeManifest;
var MemDB = require('memdb');

test('write manifest', function (t) {
  var db = MemDB();
  var result = writeManifest(db, __dirname + '/manifest.json');
  var manifest = require('./manifest.json');
  t.ok(manifest);
  t.deepEqual(result, manifest);
  t.end();
});
