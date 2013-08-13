var test = require('tape');
var writeManifest = require('../..').writeManifest;
var level = require('level-test')({ mem: true });

test('write manifest', function (t) {
  var db = level();
  writeManifest(db, __dirname + '/manifest.json');
  var manifest = require('./manifest.json');
  t.ok(manifest);
  t.end();
});