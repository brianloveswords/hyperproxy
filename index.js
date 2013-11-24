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
      function makeProxyRequest() {
        const requestOpts = this.createRequestOpts({
          headers: clientReq.headers,
          host: clientReq.headers.host,
          path: clientReq.url,
          method: clientReq.method,
        })

        if (!requestOpts) {
          const handler = Hyperproxy.errorHandler({code: 'proxyMiss'})
          return handler({
            server: server,
            req: clientReq,
            res: clientRes
          })
        }

        const proxyReq = this.request(requestOpts, handleResponse)
        function handleResponse(proxyRes) {proxyRes.pipe(clientRes)}

        clientReq.pipe(proxyReq)

        proxyReq.on('error', function (err) {
          const handler = Hyperproxy.errorHandler(err)
          return handler({
            error: err,
            server: server,
            req: clientReq,
            res: clientRes
          })
        })
      }

      callback.apply(this, [
        clientReq,
        clientRes,
        makeProxyRequest.bind(this)
      ])

    }.bind(this))

    return server
  },
}

Hyperproxy.errorHandler = function errorHandler(error) {
  return ((Hyperproxy.errorHandlers[error.code]  ||
          Hyperproxy.errorHandlers.default)
          .bind(Hyperproxy.errorHandlers))
}

Hyperproxy.errorHandlers = {
  ENOENT: function (opts) {
    // opts: { server, error, req, res}
    return this.default(opts)
  },
  'proxyMiss': function (opts) {
    const event = 'proxyMiss'
    const server = opts.server
    if (!server.listeners(event))
      return this.default(opts)
    server.emit(event, opts.req, opts.res)
  },
  'default': function (opts) {
    return Hyperproxy.badGateway(opts.server, opts.res, opts.res)
  }
}

Hyperproxy.connectionNoop =
  function connectionNoop(_, _, done) {
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

Hyperproxy.badGateway = function badGateway(server, req, res) {
  res.writeHead(502, 'Bad Gateway')
  res.write('Bad Gateway')
  return res.end()
}

Hyperproxy.error = function error(msg, obj) {
  if (typeof msg == 'object')
    msg = msg.message, obj = msg
  const err = new Error(msg)
  err.code = obj.code
  err.original = obj.original

  console.dir(err.stack)
}
