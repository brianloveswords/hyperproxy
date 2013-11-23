const path = require('path')
const fs = require('fs')

module.exports = function localSocket(file) {
  const fullPath = path.join(__dirname, 'sockets', file)
  try { fs.unlinkSync(fullPath) }
  catch (e) { if (e.code != 'ENOENT') throw e}
  finally { return fullPath }
}
