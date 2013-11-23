const fs = require('fs')
const find = require('lodash.find')
const http = require('http')
const urlglob = require('urlglob')

module.exports = Hyperproxy

function Hyperproxy(opts) {
  this.servers = opts.servers
  this.agent = opts.agent
    ? opts.agent
    : Hyperproxy.defaultAgent()
}

Hyperproxy.prototype.request = function request(opts, callback) {
  const servers = this.servers
  const path = opts.path

  const server = find(servers, function (server) {
    const hostPattern = server[0]
    return urlglob(hostPattern, opts.host)
  })

  var endpoint = server[1]

  if (Array.isArray(endpoint)) {
    const urlPatterns = endpoint
    endpoint = find(urlPatterns, function (urlPairs) {
      const urlPattern = urlPairs[0]
      return urlglob(urlPattern, path)
    })[1]
  }

  const proxyOpts = Hyperproxy.createRequestOpts(endpoint, {
    path: opts.path,
    headers: opts.headers,
    method: opts.method,
  })

  return http.request(proxyOpts, callback)
}

Hyperproxy.prototype.createServer = function createServer(callback) {
  callback = callback || Hyperproxy.connectionNoop
  const gateway = http.createServer()

  gateway.on('request', function (clientReq, clientRes) {
    function continue_() {
      const reqOpts = {
        headers: clientReq.headers,
        host: clientReq.headers.host,
        path: clientReq.url,
        method: clientReq.method,
      }

      clientReq.pipe(this.request(reqOpts, function (proxyRes) {
        proxyRes.pipe(clientRes)
      }))
    }
    callback.call(this, clientReq, clientRes, continue_.bind(this))
  }.bind(this))

  return gateway
}

Hyperproxy.connectionNoop = function connectionNoop(_, _, done) {
  return done()
}

Hyperproxy.createRequestOpts = function createRequestOpts(endpoint, opts) {
  if (Hyperproxy.isSocket(endpoint)) {
    opts.socketPath = endpoint
    return opts
  }

  if (Hyperproxy.isPort(endpoint)) {
    opts.port = endpoint
    return opts
  }

  const parts = endpoint.split(':')
  const hostname = parts[0]
  const port = parts[1]

  opts.headers.host = hostname
  opts.hostname = hostname
  opts.port = port
  return opts
}

Hyperproxy.isSocket = function isSocket(input) {
  return (input.indexOf(':') == -1 ||
          typeof input == 'number' ||
          !isNaN(Number(input)))

}
Hyperproxy.isPort = function isPort(string) {
  return string.indexOf(':') == 0
}

Hyperproxy.defaultAgent = function defaultAgent() {
  const agent = new http.Agent()
  agent.maxSockets = Infinity
  return agent;
}
