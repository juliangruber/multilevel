var getDb = require('./util').getDb
var test = require('tape')
var sublevel = require('level-sublevel')

require('./util')(function (test, _, getDb) {

  test('async', function (t) {
    t.plan(2)

    getDb(function (db) {
      sublevel(db)
      db.sublevel('foo')
      db.sublevel('bar')
    }, 
    function (db, dispose) {
      db.sublevel('foo').batch([
        {key:'f', value:'1', type: 'put'},
        {key:'b', value:'2', type: 'put', prefix: db.sublevel('bar').prefix()}
      ],
      function (err) {
        if (err) throw err
        db.sublevel('foo').get('f', function (err, value) {
          if (err) throw err
          t.equal(value, '1')
          db.sublevel('bar').get('b', function (err, value) {
            if (err) throw err
            t.equal(value, '2')
            dispose()
          })
        })
      })
    })
  })

})
