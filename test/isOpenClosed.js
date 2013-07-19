var getDb = require('./util').getDb;
var test = require('tape');

test('sync isOpen / isClosed', function (t) {
  t.plan(2);
  
  getDb(function (db, dispose) {
    t.assert(db.isOpen());
    t.assert(!db.isClosed());
    dispose();
  });
});
