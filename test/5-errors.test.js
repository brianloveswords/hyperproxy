const Proxy = require('..')
const test = require('tap').test
const testRequest = require('./request')
const localSocket = require('./localSocket')

test('no route match', function (t) {
  const proxySocket = localSocket('proxy-test.socket')
  const server = new Proxy({ servers: [] })
    .createServer()
    .listen(proxySocket)

  server.unref()

  server.on('proxyMiss', function (req, res) {
    res.writeHead(502)
    res.end('terrible gateway')
  })


  testRequest({
    socketPath: proxySocket,
    path: '/api/x/y/z.json',
    hostname: 'test.localhost',
    method: 'GET',
    json: false,
  }, function (proxyRes) {
    t.same(proxyRes.toString(), 'terrible gateway')
    t.end()
  })

})

test('no route match', function (t) {
  const proxySocket = localSocket('proxy-test.socket')
  const server = new Proxy({ servers: [
    ['*', localSocket('intentinally-dead.socket')]
  ]}).createServer().listen(proxySocket)

  server.unref()

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
