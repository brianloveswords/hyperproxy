const pkg = require('./package')
const fs = require('fs')
const path = require('path')
const find = require('./find')
const http = require('http')
const https = require('https')
const crypto = require('crypto')
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
  changeConfig: function changeConfig(opts) {
    opts = Hyperproxy.normalizeOptions(opts)
    this.https = opts.https
    this.servers = opts.servers
  },
  createServer: function createServer(callback) {
    callback = callback || Hyperproxy.connectionNoop
    const server = http.createServer()
    const requestHandler = makeRequestHandler(server, callback, this)
    server.on('request', requestHandler)

    return server
  },
  createSecureServer: function createSecureServer(callback) {
    callback = callback || Hyperproxy.connectionNoop
    const servers = this.servers
    if (!this.https)
      throw new Error('At least one endpoint must have https options to create a secure server')

    const context = {}
    const secureServer = https.createServer({
      key: this.https.key,
      cert: this.https.cert,
      pfx: this.https.pfx,
      SNICallback: function (servername) {
        const cachedContext = context[servername]
        if (cachedContext)
          return cachedContext

        const secureServers = servers.filter(function (server) {
          return server.https
        })

        const server = find(secureServers, function (server) {
          const hostPattern = server.pattern
          return urlglob(hostPattern, servername)
        })

        if (!server)
          return false

        const secureContext =
          crypto.createCredentials(server.https).context

        secureServer.emit('certificateNegotiation', servername, server)
        context[servername] = secureContext
        return secureContext
      }
    })

    const secureRequestHandler =
      makeRequestHandler(secureServer, callback, this)

    secureServer.on('request', secureRequestHandler)
    return secureServer
  }
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
      server = { pattern: server[0], endpoint: server[1] }

    if (server.https)
      opts.https = server.https = fixHttpsOptions(server.https)

    var routes = server.endpoint || server.upstream || server.routes

    if (Array.isArray(routes)) {
      delete server.endpoint
      delete server.upstream
      server.routes = routes.map(function (route) {
        if (Array.isArray(route))
          return { pattern: route[0], endpoint: route[1] }
        return route
      })
    }
    return server
  })
  return opts
}

function readFile(file) {
  return fs.readFileSync(path.resolve(file))
}
function fixHttpsOptions(https) {
  if (https.key && !Buffer.isBuffer(https.key))
    https.key = readFile(https.key)
  if (https.cert && !Buffer.isBuffer(https.cert))
    https.cert = readFile(https.cert)
  if (https.pfx && !Buffer.isBuffer(https.pfx))
    https.pfx = readFile(https.pfx)
  return https
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
    const routes = endpoint
    const found = find(routes, function (route) {
      return urlglob(route.pattern, path)
    })
    if (found)
      endpoint = found.endpoint
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
