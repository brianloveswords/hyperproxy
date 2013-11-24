const Proxy = require('..')
const test = require('tap').test
const testServer = require('./server')
const testRequest = require('./request')
const localSocket = require('./localsocket')

test('proxy server: simple routing with ports', function (t) {
  const proxySocket = localSocket('proxy-test.socket')
  const endpoint = testServer(':0')

  endpoint.on('listening', function () {
    const testPort = this.address().port
    const proxy = new Proxy({
      servers: [['localhost', ':'+testPort]]
    })

    const proxyServer = proxy.createServer(function (req, res, next) {
      req.headers['x-proxy'] = 'ti-83'
      return next()
    })

    proxyServer.listen(localSocket('proxy-test.socket'))
    proxyServer.unref && proxyServer.unref()

    t.plan(1)
    testRequest({
      port: testPort,
      path: '/',
      hostname: 'localhost',
      method: 'GET',
    }, function (proxyRes) {
      console.dir(proxyRes)
      t.same(proxyRes.port, testPort, 'port')
    })
  })
})
