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

// synchronous methods (see API below)
db.isOpen(function (err, isOpen) { /* */ })
var isOpen = db.isOpen()

// events
db.on('put', function () { /* */ })

// streams
db.readStream().on('data', function () { /* */ })
```

## API

The exposed DB has the exact same API as
[levelUp](https://github.com/rvagg/node-levelup).

The methods `db#isOpen` and `db#isClosed` needed special treatment here,
since they work synchronouly in levelUp. You can use the return value of
`db#isOpen` and `db#isClosed`, which can be up to date, but there is no guarantee.
If that's not acceptable for you, `db#isOpen(cb)` and `db#isClosed(cb)` will always
call `cb` with the correct result.

### multilevel.server(db)

Returns a server-stream that exposes `db`, an instance of levelUp.

### var db = multilevel.client()

Returns a `db` that is to be piped into a server-stream.

## Installation

```bash
npm install multilevel
```

## Contributing

The synchronous versions of `db#isOpen` and `db#isClosed` will not be up to
date if database is closed after you connected. The `close` event has to be captured
at the right place and then would modify `isOpen`.

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
