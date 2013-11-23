const fs = require('fs')
const http = require('http')

const socket = cleanupSocket(process.argv[2])

const server = http.createServer(function (req, res) {
  const headers = req.headers
  const host = headers.host
  const path = req.url
  const method = req.method

  res.write(socket + '\n')
  res.write(JSON.stringify(headers, null, '  '))
  res.end()
}).listen(socket)


function cleanupSocket(socket) {
  console.log(socket)
  if (socket.indexOf(':') == 0)
    return socket.slice(1)
  try { fs.unlinkSync(socket) }
  catch (_) { }
  finally { return socket }
}
