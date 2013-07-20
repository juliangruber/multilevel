var getLocalDb = require('./util').getLocalDb;
var through = require('through');
var multilevel = require('..');
var test = require('tape');

test('disconnect', function (t) {
  t.plan(4);

  var db = getLocalDb();
  var server = multilevel.server(db);
  var client = multilevel.client();
  var outstream = through();

  setTimeout(function () {
    var rpc = client.createRpcStream();
    server.pipe(outstream).pipe(client.createRpcStream()).pipe(server).on('error',function(){
      console.log('SERVER ERROR')
    });
  }, 10);

  client.batch([
    {type:"put",key:"a",value:"1"},
    {type:"put",key:"b",value:"2"},
    {type:"put",key:"c",value:"3"}
  ], function (err) {
    t.error(err);
    var errored = false;
    client.createReadStream().once('data',function(data){
      t.equals(data.value, "1");
      outstream.end();  
    }).on('error',function(error){
      errored = true;
      t.ok(error.message.indexOf('disconnect') > -1,'should have disconnect error');
    }).once('close',function(){
      console.log('close fired.')
      t.equals(errored,true,'must have error event before end');
    });
  });

});
