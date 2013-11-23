const path = require('path')
const http = require('http')
const concat = require('concat-stream')

module.exports = function (opts, callback) {
  opts = opts || {}
  const request = http.request({
    socketPath: opts.socketPath,
    path: opts.path,
    method: opts.method,
    headers: {
      "host": opts.host,
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.9; rv:28.0) Gecko/20100101 Firefox/28.0",
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.5",
      "accept-encoding": "gzip, deflate",
    },
  }, function (res) {
    res.pipe(concat(function (body) {
      const response = JSON.parse(body.toString())
      return callback(response)
    }))
  })

  request.end()
  return request
}
