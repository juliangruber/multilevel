require('./util')(function (test, _, getDb) {

  var sublevel = require('level-sublevel');
  var LiveStream = require('level-live-stream');

  test('stream', function (t) {
    t.plan(10);
    var j = 10;

    getDb(function (db) {
      sublevel(db);
      var foo = db.sublevel('foo');
      LiveStream.install(foo);
    },
    function (db, dispose) {
      var foo = db.sublevel('foo');
      var ls = foo.liveStream();
      ls.on('data', function (d) {
        t.equal(j-- * 1000, Number(d.value));

        if (j) return;

        ls.destroy();
        t.end();
        dispose();
      });
      ls.on('error', function () {});

      var i = 10;
      var id = setInterval(function () {
        foo.put(i, i*1000, function () {});
        if (--i) return;
        clearInterval(id);
      }, 0);
    });
  });
});

