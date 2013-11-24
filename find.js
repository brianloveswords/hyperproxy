module.exports = function find(col, testfn) {
  for (var i = 0, curr; curr = col[i], i < col.length; i++) {
    if (testfn(curr))
      return curr
  }
}
