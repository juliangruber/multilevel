var sublevel = require('level-sublevel')
var MuxDemux = require('mux-demux')

require('./util')(function (test, _, getDb) {

  test('duplex stream exposed', function (t) {
    t.plan(1)
  
    getDb(function (db, dispose) {
      var db = sublevel(db)
      var bar = db.sublevel('bar')

      // add method so it's included in the manifest
      bar.methods['dup'] = {type: 'duplex'}

      bar.dup = MuxDemux().createStream

      return { db: db }
    },
    function (db, dispose) {
      var bar = db.sublevels['bar']
      var dStream = bar.dup()
      t.ok(dStream.write({ key : 'bar', value : 'baz' }));
    })
  })
})
