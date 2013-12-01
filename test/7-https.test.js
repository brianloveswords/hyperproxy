const Proxy = require('..')
const test = require('tap').test
const testRequest = require('./request')
const servers = require('./servers')
const localSocket = require('./localsocket')

test('ssl testing', function (t) {
  const proxySocket = localSocket('proxy-test.socket')
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
    proxy.createServer().listen(proxySocket)
  proxyServer.unref()

  t.plan(2)

  proxyServer.on('certificate', function () {

  })

  testRequest({
    https: true,
    method: 'GET',
    socketPath: proxySocket,
    hostname: 'gnarly.localhost',
    path: '/',
  }, function (proxyRes, requestHeaders, responseHeaders, statusCode) {
    t.same(responseHeaders['x-server-name'], servers.gnarly.name)
  })

  testRequest({
    https: true,
    method: 'GET',
    socketPath: proxySocket,
    hostname: 'tubular.localhost',
    path: '/tubular',
  }, function (proxyRes, requestHeaders, responseHeaders, statusCode) {
    t.same(responseHeaders['x-server-name'], servers.tubular.name)
  })
})
