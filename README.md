
# multilevel

Expose a levelDB over the network, to be used by multiple processes,
with [levelUp](https://github.com/rvagg/node-levelup)'s API.

## Usage

expose a db on the server:

```js
var multilevel = require('multilevel')
var net = require('net')
var levelup = require('levelup')

var db = levelup('/my/db')
var server = multilevel.server(db)

net.createServer(function (c) {
  c.pipe(db).pipe(c)
}).listen(3000)
```

and connect to it from the client:

```js
var multilevel = require('multilevel')
var net = require('net')

var client = multilevel.client()
client.on('remote', function (db) {
  
  // asynchronous methods
  db.get('foo', function () { /* */ })
  
  // synchronous methods
  db.isOpen(function () { /* */ })
  
  // events
  db.on('put', function () { /* */ })
  
  // streams
  db.readStream().on('data', function () { /* */ })
  
})
client.pipe(net.connect(3000)).pipe(client)
```

## API

The exposed DB has the exact same API as
[levelUp](https://github.com/rvagg/node-levelup) except for the two methods
`isOpen()` and `isClosed()` which had to be made asynchronous.

### multilevel.server(db)

Returns a server-stream that exposes `db`, which can either be an instance of
levelUp or the patch to a database. 

### multilevel.client()

Returns a client-stream that is to be piped into a server-stream and emits an
`remote` event when the exposed DB is available.

## Installation

```bash
npm install multilevel
```

## Contributing

Currently you have to do the `client.on('remote', ...)` dance on the client, it
would be nice to avoid that and have the full API exposed immidiately. This
means that each method call has to be buffered until the remote is available and
then fired again.

```bash
$ npm install
$ npm test
```

## License

(MIT)

Copyright (c) 2013 Julian Gruber &lt;julian@juliangruber.com&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.