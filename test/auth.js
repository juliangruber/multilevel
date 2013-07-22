require('./util')(function (test, multilevel, getDb) {

  var sublevel = require('level-sublevel');

  var uname = 'user_' + Math.random();
  var pword = 'pw_' + Math.random();
  var opts = {
    auth: function (username, password, cb) {
      if (username == uname && password == pword) {
        cb(null, {name: uname});
      } else {
        cb(new Error('not authorized'));
      }
    },
    access: function (user, db, name, args) {
      if (!user && ~[
        'put', 'batch', 'del',
        'createWriteStream',
        'writeStream'
        ].indexOf(name)) {
        throw new Error('auth() to write');
      }
    }
  };

  test('auth', function (t) {
    t.plan(8);
    
    getDb(function (db) {
      sublevel(db);
      db.sublevel('foo');
      t.notOk(db.isClient);
      return opts;
    }, 
    function (db, dispose) {
      t.ok(db.isClient);

      db.put('foo', 'not allowed', function (err) {
        t.ok(err);

        db.auth(uname, pword, function (err, user) {
          t.notOk(err);
          t.equal(uname, user.name);

          db.put('foo', 'bar', function (err) {
            t.error(err);

            db.get('foo', function (err, value) {
              t.error(err);
              t.equal(value, 'bar');
              dispose();
            });
          });
        });
      });
    });
  });

  test('auth - nested', function (t) {
    t.plan(7);
    
    getDb(function (db) {
      sublevel(db);
      db.sublevel('foo');
      t.notOk(db.isClient);
      return opts;
    }, 
    function (db, dispose) {
      t.ok(db.isClient);
      var fooDb = db.sublevel('foo');
      
      fooDb.put('foo', 'not allowed', function (err) {
        t.ok(err, 'not authed');

        db.auth(uname, pword, function (err) {
          t.notOk(err, 'is authed');

          fooDb.put('foo', 'bar', function (err) {
            t.error(err);

            fooDb.get('foo', function (err, value) {
              t.error(err);
              t.equal(value, 'bar');
              dispose();
            });
          });
        });
      });
    });
  });
});
