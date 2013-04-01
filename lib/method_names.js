var methods = {
  "stream" : [
    "readStream", "keyStream", "valueStream", "writeStream",
    "createReadStream", "createKeyStream", "createValueStream",
    "createWriteStream"
  ],

  "sync" : [
    "isOpen", "isClosed"
  ],

  "async" : [
    "put", "get", "del", "batch", "approximateSize"
  ]
}

module.exports = function (/* ... */) {
  var ret = []
  var args = [].slice.call(arguments)
  args.forEach(function (name) {
    ret.push.apply(ret, methods[name])
  })
  return ret
} 
