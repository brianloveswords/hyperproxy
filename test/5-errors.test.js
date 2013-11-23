const Proxy = require('..')
const test = require('tap').test
const testRequest = require('./request')
const localSocket = require('./localSocket')

test('no route match', function (t) {
  const proxySocket = localSocket('proxy-test.socket')
  const server = new Proxy({ servers: [] })
    .createServer()
    .listen(proxySocket)
    .unref()

  testRequest({
    socketPath: proxySocket,
    path: '/api/x/y/z.json',
    hostname: 'test.localhost',
    method: 'GET',
    json: false,
  }, function (proxyRes) {
    t.same(proxyRes.toString(), 'Bad Gateway')
    t.end()
  })

})
