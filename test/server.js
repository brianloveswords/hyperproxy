const fs = require('fs')
const http = require('http')
const concat = require('concat-stream')

module.exports = makeServer

function makeServer(socketOrPort, opts) {
  opts = opts || {}
  socketOrPort = cleanupSocket(socketOrPort)

  console.log('starting test server on', socketOrPort)

  var listeningPort
  const server = http.createServer(function (req, res) {
    const headers = req.headers
    const host = headers.host
    const path = req.url
    const method = req.method

    req.pipe(concat(function (data) {
      res.writeHead(opts.statusCode || 200, opts.headers)
      res.write(JSON.stringify({
        requestHeaders: headers,
        socketPath: socketOrPort,
        port: listeningPort,
        host: host,
        path: path,
        method: method,
        body: opts.body,
        postData: data.toString(),
      }, null, '  '))

      res.end()
    }))

  }).listen(socketOrPort)

  server.on('listening', function () {
    listeningPort = this.address().port
  })

  server.unref && server.unref()
  server.socket = socketOrPort
  return server
}

function cleanupSocket(socket) {
  if (socket.indexOf(':') == 0)
    return socket.slice(1)

  try { fs.unlinkSync(socket) }
  catch (e) { if (e.code != 'ENOENT') throw e}
  finally { return socket }
}
