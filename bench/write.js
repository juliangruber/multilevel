module.exports = function (str) {
  return function write (dbs, num, cb) {
    if (!Array.isArray(dbs)) dbs = [dbs];
    var written = 0
    var start = Date.now()

    function rand () {
      return dbs[Math.floor(Math.random() * dbs.length)]
    }

    for (var i = 0; i < num; i++) {
      rand().put(''+i, str, function (err) {
        if (err) {
          var oldCb = cb
          cb = function () {}
          return oldCb(err)
        }
        if (++written == num) {
          var duration = Date.now() - start
          cb(
            null,
            duration + 'ms (' + (Math.round(num/duration*1000)) + ' ops/s)'
          )
        }
      })
    }
  }
};
