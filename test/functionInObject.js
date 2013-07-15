var getDb = require('./util').getDb;
var test = require('tape');

var obj = {
  getImage: function () {},
  a: 2
};

test('function in json', function (t) {
  t.plan(3);
  
  getDb(function (db, dispose) {
    db.put('foo', obj, { valueEncoding: 'json' }, function (err) {
      t.error(err);
      db.get('foo', { valueEncoding: 'json' }, function (err, val) {
        t.error(err);
        t.equal(val.a, 2);
        dispose();
      });
    });
  });
});
