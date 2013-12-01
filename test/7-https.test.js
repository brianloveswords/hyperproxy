const Proxy = require('..')
const test = require('tap').test
const testRequest = require('./request')
const servers = require('./servers')
const localSocket = require('./localsocket')

test('ssl testing', function (t) {
  const proxySocket = localSocket('proxy-test.socket')
  const proxy = new Proxy({
    ssl: 'true',
    servers: [{
      pattern: 'localhost',
      endpoint: servers.gnarly.start(),
    }, {
      pattern: 'sub.localhost',
      routes: [
        ['/tubular', servers.tubular.start()],
        ['/way-cool', servers.wayCool.start()],
      ]
    }]
  })

  const proxyServer =
    proxy.createServer().listen(proxySocket)
  proxyServer.unref()

  t.plan(2)

  testRequest({
    method: 'GET',
    socketPath: proxySocket,
    hostname: 'localhost',
    path: '/',
  }, function (proxyRes, requestHeaders, responseHeaders, statusCode) {
    t.same(responseHeaders['x-server-name'], servers.gnarly.name)
  })

  testRequest({
    method: 'GET',
    socketPath: proxySocket,
    hostname: 'sub.localhost',
    path: '/tubular',
  }, function (proxyRes, requestHeaders, responseHeaders, statusCode) {
    t.same(responseHeaders['x-server-name'], servers.tubular.name)
  })
})
