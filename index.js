const fs = require('fs')
const find = require('lodash.find')
const minimatch = require('minimatch')
const http = require('http')
const url = require('url')

module.exports = Proxy

function Proxy(opts) {
  this.socket = opts.socket
  if (!this.socket)
    this.port = opts.port || 3141
  this.servers = opts.servers
  this.agent = opts.agent
    ? opts.agent
    : Proxy.defaultAgent()
}

Proxy.prototype.request = function request(opts, callback) {
  const servers = this.servers

  const server = find(servers, function (server) {
    const hostPattern = server[0]
    return minimatch(opts.host, hostPattern)
  })

  const proxyOpts = Proxy.createRequestOpts(server[1], {
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

  return this.openGateway(gateway)
}

Proxy.prototype.openGateway = function openGateway(gateway) {
  const port = this.port
  const socket = this.socket

  if (socket) {
    try { fs.unlinkSync(socket) }
    catch (e) { if (e.code != 'ENOENT') throw (e) }
    finally { return gateway.listen(socket) }
  }
  return gateway.listen(port)
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
