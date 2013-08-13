# multilevel

Expose a levelDB over the network, to be used by multiple processes,
with [levelUp](https://github.com/rvagg/node-levelup)'s API.

[![Build Status](https://travis-ci.org/juliangruber/multilevel.png?branch=master)](https://travis-ci.org/juliangruber/multilevel)

[![NPM](https://nodei.co/npm/multilevel.png)](https://nodei.co/npm/multilevel/)

## Usage

Expose a db on the server:

```js
var multilevel = require('multilevel');
var net = require('net');
var level = require('level');

var db = level('/my/db');

net.createServer(function (con) {
  con.pipe(multilevel.server(db)).pipe(con);
}).listen(3000);
```

And connect to it from the client:

```js
var multilevel = require('multilevel');
var net = require('net');

var db = multilevel.client();
var con = net.connect(3000);
con.pipe(db.createRpcStream()).pipe(con);

// asynchronous methods
db.get('foo', function () { /* */ });

// streams
db.createReadStream().on('data', function () { /* */ });
```

## Compatibility and binary data

multilevel works in the browser too - via
[browserify](https://github.com/substack/node-browserify) - and has full
support for binary data. For getting a connection between browser and server I
recommend either
[websocket-stream](https://github.com/maxogden/websocket-stream), which treats
binary data well, or
[engine.io-stream](https://github.com/Raynos/engine.io-stream), which has
websocket fallbacks.

When using a binary capable transport, require multilevel like this:

```js
var multilevel = require('multilevel/msgpack');
```

This way it uses [msgpack-stream](https://github.com/dominictarr/msgpack-stream)
instead of [json-buffer](https://github.com/dominictarr/json-buffer) which uses
way less bandwidth - but needs a binary capable transport.

## Plugins

You can also expose custom methods and [sublevels](https://github.com/dominictarr/level-sublevel)
with `multilevel`!

When using plugins, you must generate a manifest and require it in the client.

Here's an example:

``` js
// server.js
// create `db`
var level = require('level');
var multilevel = require('multilevel');
var db = level(PATH);

// extend `db` with a foo(cb) method
db.methods = db.methods || {};
db.methods['foo'] = { type: 'async' };
db.foo = function (cb) {
  cb(null, 'bar');
};

// now write the manifest to a file
multilevel.writeManifest(db, __dirname + '/manifest.json');

// then expose `db` via shoe or any other streaming transport.
var shoe = require('shoe');
var sock = shoe(function (stream) {
  stream.pipe(multilevel.server(db)).pipe(stream);
});
sock.install(http.createServer(/* ... */), '/websocket');
```

Manifests are generated using
[level-manifest](https://github.com/dominictarr/level-manifest), which doesn't
only support async functions but e.g. streams as well. For more, check its README.

Then require the manifest on the client when bundling with browserify or in
any other nodejs compatible environment.

``` js
// client.js
// instantiate a multilevel client with the `manifest.json` we just generated
var multilevel = require('multilevel');
var manifest = require('./manifest.json');
var db = multilevel.client(manifest);

// now pipe the db to the server
var stream = shoe('/websocket');
stream.pipe(db.createRpcStream()).pipe(stream);

// and you can call the custom `foo` method!
db.foo(function (err, res) {
  console.log(res); // => "bar"
});
```

## Authentication

You do not want to expose every database feature to every user, you might e.g.
only want to provide read-only access to some users.

Auth controls may be injected when creating the server stream.

In this example, allow read only access, unless logged in as root.

```js
//server.js
var db = require('./setup-db'); //all your database customizations
var multilevel = require('multilevel');

//write out manifest
multilevel.writeManifest(db, __dirname + '/manifest.json');

shoe(function (stream) {
  stream.pipe(multilevel.server(db, {
    auth: function (user, cb) {
      if (user.name == 'root' && user.pass == 'toor') {
        //the data returned will be attached to the mulilevel stream
        //and passed to `access`
        cb(null, {name: 'root'});
      } else {
        cb(new Error('not authorized');
      }
    },
    access: function (user, db, method, args) {
      //`user` is the {name: 'root'} object that `auth`
      //returned. 

      //if not a privliged user...
      if (!user || user.name !== 'root') {
        //do not allow any write access
        if (/^put|^del|^batch|write/i.test(method)) {
          throw new Error('read-only access');
        }
      }        
    })
  })).pipe(stream);
});

// ...
```

The client authorizes by calling the auth method.

``` js
var multilevel = require('multilevel');
var shoe = require('shoe');

var stream = shoe();
var db = multilevel.client();
stream.pipe(db.createRpcStream()).pipe(stream);

db.auth({ name: 'root', pass: 'toor' }, function (err, data) {
  if (err) throw err
  //later, they can sign out, too.

  db.deauth(function (err) {
    //signed out!
  });
});
```

## API

The exposed DB has the exact same API as
[levelUp](https://github.com/rvagg/node-levelup), except

* `db#close()` closes the connection, instead of the database.
* the synchronous versions of `db#isOpen()` and `db#isClose()` tell you if you
currently have a connection to the remote db.
* events, like `db.on("put", ...)` are not emitted. If you need updates, you
can use [level-live-stream](https://github.com/dominictarr/level-live-stream).

### multilevel.server(db[, authOpts])

Returns a server-stream that exposes `db`, an instance of levelUp.
`authOpts` is optional and should be of this form:

``` js
var authOpts = {
  auth: function (userData, cb) {
    //call back an error, if the user is not authorized.
  },
  access: function (userData, db, method, args) {
    //throw if this user is not authorized for this action.
  }
}
```

### multilevel.writeManifest(db, path)

**Synchronoulsy** write `db`'s manifest to `path`.

### var db = multilevel.client([manifest])

Return a new client db. `manifest` may optionally be provided, which will
grant the client access to extensions and sublevels.

#### db.createRpcStream()

Pipe this into a server stream.

#### db.auth(data, cb)

Authorize with the server.

#### db.deauth (cb)

Deauthorize with the server.

## Performance

On my macbook pro one multilevel server handles ~15k ops/s over a local tcp
socket.

```js
 ∴  bench (master) : node index.js 

writing "1234567890abcdef" 100 times

 native             : 2ms (50000 ops/s)
 multilevel direct  : 21ms (4762 ops/s)
 multilevel network : 14ms (7143 ops/s)

writing "1234567890abcdef" 1000 times

 native             : 12ms (83333 ops/s)
 multilevel direct  : 71ms (14085 ops/s)
 multilevel network : 77ms (12987 ops/s)

writing "1234567890abcdef" 10000 times

 native             : 88ms (113636 ops/s)
 multilevel direct  : 594ms (16835 ops/s)
 multilevel network : 590ms (16949 ops/s)

writing "1234567890abcdef" 100000 times

 native             : 927ms (107875 ops/s)
 multilevel direct  : 10925ms (9153 ops/s)
 multilevel network : 9839ms (10164 ops/s)
```

## Installation

With [npm](http://npmjs.org) do:

```bash
$ npm install multilevel
```

## Contributing

```bash
$ npm install
$ npm test
$ npm run test-browser
```

## Contributors

* [@juliangruber](https://github.com/juliangruber)
* [@dominictarr](https://github.com/dominictarr)

## License

(MIT)

Copyright (c) 2013 Julian Gruber &lt;julian@juliangruber.com&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
