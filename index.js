const fs = require('fs')
const find = require('lodash.find')
const http = require('http')
const urlglob = require('./urlglob')

module.exports = Proxy

function Proxy(opts) {
  this.servers = opts.servers
  this.agent = opts.agent
    ? opts.agent
    : Proxy.defaultAgent()
}

Proxy.prototype.request = function request(opts, callback) {
  const servers = this.servers
  const path = opts.path

  const server = find(servers, function (server) {
    const hostPattern = server[0]
    return urlglob(hostPattern, opts.host)
  })

  var socketOrPort = server[1]

  if (Array.isArray(socketOrPort)) {
    const urlPatterns = socketOrPort
    socketOrPort = find(urlPatterns, function (urlPairs) {
      const urlPattern = urlPairs[0]
      return urlglob(urlPattern, path)
    })[1]
  }

  const proxyOpts = Proxy.createRequestOpts(socketOrPort, {
    path: opts.path,
    headers: opts.headers,
    method: opts.method,
  })

  return http.request(proxyOpts, callback)
}

Proxy.prototype.createServer = function createServer(callback) {
  callback = callback || Proxy.connectionNoop
  const gateway = http.createServer()

  gateway.on('request', function (clientReq, clientRes) {
    function continue_() {
      const headers = clientReq.headers
      const host = headers.host
      const path = clientReq.url
      const method = clientReq.method

      clientReq.pipe(this.request({
        host: host,
        path: path,
        headers: headers,
        method: method,
      }, function (proxyRes) {
        proxyRes.pipe(clientRes)
      }))
    }
    callback.call(this, clientReq, clientRes, continue_.bind(this))
  }.bind(this))

  return gateway
}

Proxy.connectionNoop = function connectionNoop(_, _, done) {
  return done()
}

Proxy.createRequestOpts = function createRequestOpts(socketOrPort, opts) {
  if (Proxy.isSocket(socketOrPort))
    opts.socketPath = socketOrPort
  else opts.port = socketOrPort
  return opts
}

Proxy.isSocket = function isSocket(string) {
  return string.indexOf(':') == -1
}

Proxy.defaultAgent = function defaultAgent() {
  const agent = new http.Agent()
  agent.maxSockets = Infinity
  return agent;
}
