const Proxy = require('..')
const test = require('tap').test
const testRequest = require('./request')
const localSocket = require('./localsocket')
const nock = require('nock')

const example = nock('http://example.com')
  .get('/whatever')
  .reply(200, {message: 'received'})

test('proxy server: remote routing', function (t) {
  const proxySocket = localSocket('proxy-test.socket')

  const proxy = new Proxy({
    servers: [
      ['example.localhost', 'example.com:80']
    ]
  })

  const proxyServer = proxy
    .createServer()
    .listen(proxySocket)
  proxyServer.unref && proxyServer.unref()

  testRequest({
    socketPath: proxySocket,
    path: '/whatever',
    hostname: 'example.localhost',
    method: 'GET',
  }, function (proxyRes) {
    t.same(proxyRes.message, 'received')
    t.end()
  })

})
