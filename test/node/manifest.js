var test = require('tape');
var writeManifest = require('../..').writeManifest;
var MemDB = require('memdb');

test('write manifest', function (t) {
  var db = MemDB();
  writeManifest(db, __dirname + '/manifest.json');
  var manifest = require('./manifest.json');
  t.ok(manifest);
  t.end();
});