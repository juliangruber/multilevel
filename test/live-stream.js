require('./util')(function (test, _, getDb) {

  var sublevel = require('level-sublevel');
  var LiveStream = require('level-live-stream');

  test('stream', function (t) {
    t.plan(20);
    var j = 10;

    getDb(function (db) {
      db = sublevel(db);
      LiveStream.install(db.sublevel('foo'));
      return { db: db };
    },
    function (db, dispose) {
      var foo = db.sublevel('foo');
      var ls = foo.liveStream();
      ls.on('data', function (d) {
        t.equal(j-- * 1000, Number(d.value));

        if (j) return;

        ls.destroy();
        dispose();
      });
      ls.on('error', function () {});

      setTimeout(function() {
        var i = 10;
        var id = setInterval(function () {
          foo.put(i, i*1000, function (err) {
            t.error(err);
          });
          if (--i) return;
          clearInterval(id);
        }, 0);
      }, 10);
    });
  });
});

