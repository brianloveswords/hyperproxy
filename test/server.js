const path = require('path')
const fs = require('fs')
const http = require('http')

module.exports = makeServer

function makeServer(socket) {
  socket = cleanupSocket(socket)

  console.log('starting test server on', socket)

  const server = http.createServer(function (req, res) {
    const headers = req.headers
    const host = headers.host
    const path = req.url
    const method = req.method

     res.write(JSON.stringify({
      socket: socket,
      headers: headers,
      host: host,
      path: path,
      method: method,
    }, null, '  '))

    res.end()

  }).listen(socket)
  server.unref()
  return server
}

function cleanupSocket(socket) {
  if (socket.indexOf(':') == 0)
    return socket.slice(1)

  const sockPath = path.join(__dirname, 'sockets', socket)

  try { fs.unlinkSync(sockPath) }
  catch (e) { console.dir(e) }
  finally { return sockPath }
}
