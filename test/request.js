const path = require('path')
const http = require('http')
const https = require('http')
const concat = require('concat-stream')

module.exports = function (opts, callback) {
  opts = opts || {}
  const requestMethod = (opts.https == true)
    ? https.request.bind(https)
    : http.request.bind(http)

  const request = requestMethod({
    socketPath: opts.socketPath,
    port: opts.port,
    path: opts.path,
    method: opts.method,
    hostname: opts.hostname,
    headers: {
      "host": opts.hostname,
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.9; rv:28.0) Gecko/20100101 Firefox/28.0",
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.5",
      "accept-encoding": "gzip, deflate",
    },
  }, function (res) {
    res.pipe(concat(function (body) {
      if (opts.json === false)
        return callback(body)
      const response = JSON.parse(body.toString())
      const requestHeaders = response.requestHeaders
      const responseHeaders = res.headers
      return callback(response, requestHeaders, responseHeaders, res.statusCode)
    }))
  })
  request.end(opts.postData || Buffer(''))
  return request
}
