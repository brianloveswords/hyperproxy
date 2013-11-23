const Proxy = require('..')
const test = require('tap').test
const testServer = require('./server')
const testRequest = require('./request')
const localSocket = require('./localSocket')

test('proxy server: simple routing', function (t) {
  const testSocket1 = localSocket('test.socket')
  const testSocket2 = localSocket('test2.socket')
  const proxySocket = localSocket('proxy-test.socket')

  const testServer1 = testServer(testSocket1)
  const testServer2 = testServer(testSocket2)

  const proxy = new Proxy({
    servers: [
      ['test.localhost', testSocket1],
      ['*', testSocket2]
    ]
  })

  const gateway = proxy.createServer(function (req, res, next) {
    req.headers['x-proxy'] = 'ti-83'
    return next()
  })

  gateway.listen(localSocket('proxy-test.socket'))
  gateway.unref()

  const path = '/stuff?opt=yah'

  t.plan(9)
  testRequest({
    socketPath: proxySocket,
    path: path,
    host: 'test.localhost',
    method: 'GET',
  }, function (proxyRes) {
    t.same(proxyRes.headers['x-proxy'], 'ti-83', 'correct header')
    t.same(proxyRes.socketPath, testSocket1, 'correct socket')
    t.same(proxyRes.host, 'test.localhost', 'correct host')
    t.same(proxyRes.path, path, 'correct path')
  })

  const postData = Buffer('id=proxyproxyproxy')
  testRequest({
    socketPath: proxySocket,
    path: path,
    host: 'localhost.whatever.lol',
    method: 'POST',
    data: postData,
  }, function (proxyRes) {
    t.same(proxyRes.data, postData.toString(), 'correct post data')
    t.same(proxyRes.headers['x-proxy'], 'ti-83', 'correct header')
    t.same(proxyRes.socketPath, testSocket2, 'correct socket')
    t.same(proxyRes.host, 'localhost.whatever.lol', 'correct host')
    t.same(proxyRes.path, path, 'correct path')
  })
})
