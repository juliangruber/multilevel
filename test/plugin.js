var sublevel = require('level-sublevel')

require('./util')(function (test, _, getDb) {

  test('stream', function (t) {
    t.plan(2)
  
    getDb(function (db) {
      sublevel(db)
      var foo = db.sublevel('foo')

      //add inc to the manifest
      foo.methods['inc'] = {type: 'async'}

      //implement it
      foo.inc = function (f, cb) {
        if(!cb) {
          cb = f
          foo.get('inc', function (err, val) {
            cb(err, val)
          })
        } else {
          foo.get('inc', function (err, val) {
            val = Number(val || 0) + Number(f)
            foo.put('inc', val, function (err) {
              if(err) cb(err)
              else    cb(null, val)
            })
          })
        }
      }

    },
    function (db, dispose) {
      var foo = db.sublevels['foo']
      foo.inc(1, function (err, val) {
        t.equal(val, 1)
        foo.inc(2, function (err, val) {
          t.equal(val, 3)
          t.end()
          dispose()
        })
      })
    })
  })

})
