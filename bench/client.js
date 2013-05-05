var multilevel = require('..');
var net = require('net');

var port = process.argv[2];
var num = Math.round(Number(process.argv[3]));
var str = process.argv[4];

var write = require('./write')(str);

var db = multilevel.client()
var con = net.connect(port)
db.pipe(con).pipe(db)

var start = Date.now()
write(db, num, function (err, results) {
  console.log(Date.now() - start)
  con.destroy();
  process.exit(0);
})  
