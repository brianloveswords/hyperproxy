const pkg = require('./package')
const fs = require('fs')
const find = require('./find')
const http = require('http')
const https = require('https')
const urlglob = require('urlglob')

module.exports = Hyperproxy

function Hyperproxy(opts, callback) {
  if (!(this instanceof Hyperproxy))
    return new Hyperproxy(opts, callback)

  opts = Hyperproxy.normalizeOptions(opts)
  this.https = opts.https
  this.servers = opts.servers
  this.agent = opts.agent
    ? opts.agent
    : Hyperproxy.defaultAgent()

  if (callback)
    return this.createServer(callback)
}

Hyperproxy.VERSION = pkg.version

Hyperproxy.prototype = {
  changeUpstreams: function changeUpstream(servers) {
    this.servers = servers
  },
  createServer: function createServer(callback) {
    callback = callback || Hyperproxy.connectionNoop
    const server = http.createServer()
    const requestHandler = makeRequestHandler(server, callback, this)
    server.on('request', requestHandler)

    if (this.https) {
      const secureServer = https.createServer({
        key: this.https.key,
        cert: this.https.cert,
        pfx: this.https.pfx,
        SNICallback: function (servername) {
          console.log('server name', servername)
        }
      })
      const secureRequestHandler =
        makeRequestHandler(secureServer, callback, this)
      secureServer.on('request', secureRequestHandler)
    }

    return server
  },
}

function makeRequestHandler(server, callback, ctx) {
  return function(clientReq, clientRes) {
    function proxyMiss(server, req, res) {
      const handler = Hyperproxy.errorHandler({
        code: 'proxyMiss'
      })

      return handler({
        server: server,
        req: clientReq,
        res: clientRes
      })
    }

    function makeProxyRequest() {
      if (!clientReq.headers.host)
        return proxyMiss(server, clientReq, clientRes)

      const host = clientReq.headers.host.split(':')[0]

      const requestOpts = Hyperproxy.createRequestOpts({
        servers: ctx.servers,
        headers: clientReq.headers,
        host: host,
        path: clientReq.url,
        method: clientReq.method,
      })

      if (!requestOpts)
        return proxyMiss(server, clientReq, clientRes)

      const proxyReq = http.request(requestOpts, endpointResponse)
      function endpointResponse(proxyRes) {
        clientRes.writeHead(proxyRes.statusCode, proxyRes.headers)
        proxyRes.pipe(clientRes)
      }

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
    callback.apply(ctx, [
      clientReq,
      clientRes,
      makeProxyRequest
    ])
  }
}


Hyperproxy.normalizeOptions = function normalizeOptions(opts) {
  opts.servers = opts.servers.map(function (server) {
    // array style: [pattern, endpoint]
    if (Array.isArray(server))
      return { pattern: server[0], endpoint: server[1] }

    if (server.https)
      opts.https = server.https

    return server
  })
  return opts
}

Hyperproxy.createRequestOpts = function createRequestOpts(opts) {
  const servers = opts.servers
  const path = opts.path

  const server = find(servers, function (server) {
    const hostPattern = server.pattern
    return urlglob(hostPattern, opts.host)
  })

  if (!server)
    return false

  var endpoint = server.endpoint || server.upstream || server.routes

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
}

Hyperproxy.finishRequestOpts =
  function finishRequestOpts(endpoint, opts) {
    if (Hyperproxy.isSocket(endpoint)) {
      opts.socketPath = endpoint
      return opts
    }

    if (Hyperproxy.isPort(endpoint)) {
      opts.port = (''+endpoint).split(':')[1]
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

Hyperproxy.errorHandler = function errorHandler(error) {
  return ((Hyperproxy.errorHandlers[error.code]  ||
          Hyperproxy.errorHandlers.unknown)
          .bind(Hyperproxy.errorHandlers))
}

Hyperproxy.errorHandlers = {
  ENOENT: function (opts) {
    return Hyperproxy.errorEvent('missingSocketFile', opts)
  },
  ENOTFOUND: function (opts) {
    return Hyperproxy.errorEvent('hostNotFound', opts)
  },
  proxyMiss: function (opts) {
    return Hyperproxy.errorEvent('proxyMiss', opts)
  },
  unknown: function (opts) {
    return Hyperproxy.errorEvent('unknownError', opts)
  },
}

Hyperproxy.errorEvent = function (event, opts) {
  const server = opts.server
  const handleBadGateway =
    Hyperproxy.badGateway.bind(Hyperproxy, opts)

  server.emit('proxyError', opts.error)

  if (!server.listeners(event).length)
    return handleBadGateway()

  server.emit(event, opts.error, opts.req, opts.res, handleBadGateway)
}

Hyperproxy.connectionNoop = function connectionNoop(_, _, done) {
  return done()
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

Hyperproxy.badGateway = function badGateway(opts) {
  const res = opts.res
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
}
