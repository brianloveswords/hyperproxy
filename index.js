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

Hyperproxy.prototype = {
  request: function request(opts, callback) {
    return http.request(opts, callback)
  },

  createRequestOpts: function createRequestOpts(opts) {
    const servers = this.servers
    const path = opts.path

    const server = find(servers, function (server) {
      const hostPattern = server[0]
      return urlglob(hostPattern, opts.host)
    })

    if (!server)
      return false

    var endpoint = server[1]

    if (Array.isArray(endpoint)) {
      const urlPatterns = endpoint
      endpoint = find(urlPatterns, function (urlPairs) {
        const urlPattern = urlPairs[0]
        return urlglob(urlPattern, path)
      })[1]
    }

    if (!endpoint)
      return false

    return Hyperproxy.finishRequestOpts(endpoint, {
      path: opts.path,
      headers: opts.headers,
      method: opts.method,
    })
  },

  createServer: function createServer(callback) {
    callback = callback || Hyperproxy.connectionNoop
    const server = http.createServer()

    server.on('request', function (clientReq, clientRes) {
      function continue_() {
        const requestOpts = this.createRequestOpts({
          headers: clientReq.headers,
          host: clientReq.headers.host,
          path: clientReq.url,
          method: clientReq.method,
        })

        if (!requestOpts) {
          clientRes.writeHead(502, 'Bad Gateway')
          clientRes.write('Bad Gateway')
          return clientRes.end()
        }

        function handleResponse(proxyRes) {proxyRes.pipe(clientRes)}
        clientReq.pipe(this.request(requestOpts, handleResponse))
      }

      callback.apply(this, [
        clientReq,
        clientRes,
        continue_.bind(this)
      ])

    }.bind(this))

    return server
  },
}

Hyperproxy.connectionNoop = function connectionNoop(_, _, done) {
  return done()
}

Hyperproxy.finishRequestOpts =
  function finishRequestOpts(endpoint, opts) {
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
