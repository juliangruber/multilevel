# multilevel

Expose a levelDB over the network, to be used by multiple processes,
with [levelUp](https://github.com/rvagg/node-levelup)'s API.

[![Build Status](https://travis-ci.org/juliangruber/multilevel.png?branch=master)](https://travis-ci.org/juliangruber/multilevel)

## Usage

expose a db on the server:

```js
var multilevel = require('multilevel')
var net = require('net')
var levelup = require('levelup')

var db = levelup('/my/db')

net.createServer(function (c) {
  c.pipe(multilevel.server(db)).pipe(c)
}).listen(3000)
```

and connect to it from the client:

```js
var multilevel = require('multilevel')
var net = require('net')

var db = multilevel.client()
db.pipe(net.connect(3000)).pipe(db)
  
// asynchronous methods
db.get('foo', function () { /* */ })

// streams
db.createReadStream().on('data', function () { /* */ })
```

## sublevel plugins

You can also expose custom methods and [sublevels](https://github.com/dominictarr/level-sublevel)
with `multilevel`!

When using sublevels, you must generate a manifest, and require it in the client.
``` js
//server.js
var db = require('./setup-db') //all your database customizations
var fs = require('fs')
var createManifest = require('level-manifest')

//write out manifest
fs.writeFileSync('./manifest.json', JSON.stringify(createManifest(db)))

shoe(function (stream) {
  stream.pipe(multilevel.server(db)).pipe(stream)
})
...
```
Then, the manifest is required from the client when bundling with browserify.

``` js
//client.js
var manifest = require('./manifest.json')
var stream = shoe()
var db = multilevel.client(manifest)
stream.pipe(db).pipe(stream)
//now, get remote access to your extensions!
db.sublevel('foo').createLiveStream()
```

## auth

You do not want to expose every database feature to every user,
yet, you may want to provide some read-only access, or something.

Auth controls may be injected when creating the server stream.

Allow read only access, unless logged in as root.
``` js
//server.js
var db = require('./setup-db') //all your database customizations
var fs = require('fs')
var createManifest = require('level-manifest')

//write out manifest
fs.writeFileSync('./manifest.json', JSON.stringify(createManifest(db)))

shoe(function (stream) {
  stream.pipe(multilevel.server(db, {
    auth: function (user, cb) {
      if(user.name == 'root' && user.pass == 'toor') {
        //the data returned will be attached to the mulilevel stream
        //and passed to `access`
        cb(null, {name: 'root'})
      } else
        cb(new Error('not authorized')
    },
    access: function (user, db, method, args) {
      //`user` is the {name: 'root'} object that `auth`
      //returned. 

      //if not a privliged user...
      if(!user || user.name !== 'root') {
        //do not allow any write access
        if(/^put|^del|^batch|write/i.test(method))
          throw new Error('read-only access')
      }        
    })
  })).pipe(stream)
})
...
```

The client authorizes by calling the auth method.

``` js
var stream = shoe()
var db = multilevel.client()
stream.pipe(db).pipe(stream)

db.auth({name: 'root', pass: 'toor'}, function (err, data) {
  if(err) throw err
  //later, they can sign out, too.

  db.deauth(function (err) {
    //signed out!
  })
})
```

## API

The exposed DB has the exact same API as
[levelUp](https://github.com/rvagg/node-levelup).
Except that `close` closes the connection, instead of the database.
`isOpen` and `isClose` tell you if you currently have a connection
to the remote db.

### multilevel.server(db, authOpts?)

Returns a server-stream that exposes `db`, an instance of levelUp.
`authOpts` is optional, it should match this:

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
### var db = multilevel.client(manifest?)

Returns a `db` that is to be piped into a server-stream.
`manifest` may be optionally be provided,
which will allow client access to extensions.

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

```bash
npm install multilevel
```

## Contributing

```bash
$ npm install
$ npm test
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
