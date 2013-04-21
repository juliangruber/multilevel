
module.exports = function (obj, iter) {
  ;(function recurse(obj, path){
    for(var k in obj.methods) {
      iter(obj[k], path.concat(k))
    }
    recurse
  }(obj, [])
}
