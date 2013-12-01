const path = require('path')
const Proxy = require('..')
const test = require('tap').test
const https = require('https')
const testRequest = require('./request')
const servers = require('./servers')
const localSocket = require('./localsocket')
const xtend = require('xtend')

test('ssl testing', function (t) {
  const proxy = new Proxy({
    servers: [{
      pattern: '127.0.0.1',
      endpoint: servers.gnarly.start(),
      https: servers.gnarly.tlsOptions(),
    }, {
      pattern: 'localhost',
      endpoint: servers.tubular.start(),
      https: {
        key: path.join(__dirname, 'cert', 'ia.key'),
        cert: path.join(__dirname, 'cert', 'tubular.localhost.crt'),
      }
    }]
  })

  const proxyServer =
    proxy.createSecureServer();

  proxyServer.listen(0)
  proxyServer.unref()

  t.plan(4)

  setTimeout(function () {
    console.log('exiting process...')
    proxyServer.close(function () {
      process.exit(0)
    })
  }, 1000)

  proxyServer.on('certificateNegotiation', function (host, server) {
    t.same(server.pattern, host, 'should have right host')
  })

  proxyServer.on('listening', function () {
    const port = this.address().port
    const opts = {
      https: true,
      port: port,
      method: 'GET',
      path: '/',
    }
    testRequest(xtend(opts, {
      hostname: '127.0.0.1'
    }), function (proxyRes, requestHeaders, responseHeaders, statusCode) {
      t.same(responseHeaders['x-server-name'], servers.gnarly.name)
    })

    testRequest(xtend(opts, {
      hostname: 'localhost'
    }), function (proxyRes, requestHeaders, responseHeaders, statusCode) {
      t.same(responseHeaders['x-server-name'], servers.tubular.name)
    })
  })
})
