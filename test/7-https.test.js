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
      pattern: 'localhost',
      routes: [
        ['/way-cool', servers.wayCool.start()],
        ['/mondo', servers.mondo.start()],
      ]
    }, {
      pattern: 'gnarly.localhost',
      endpoint: servers.gnarly.start(),
      https: servers.gnarly.tlsOptions(),
    }, {
      pattern: 'tubular.localhost',
      endpoint: servers.tubular.start(),
      https: servers.tubular.tlsOptions(),
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
      hostname: 'gnarly.localhost'
    }), function (proxyRes, requestHeaders, responseHeaders, statusCode) {
      t.same(responseHeaders['x-server-name'], servers.gnarly.name)
    })

    testRequest(xtend(opts, {
      hostname: 'tubular.localhost'
    }), function (proxyRes, requestHeaders, responseHeaders, statusCode) {
      t.same(responseHeaders['x-server-name'], servers.tubular.name)
    })
  })
})
