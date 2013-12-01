const Proxy = require('..')
const test = require('tap').test
const testServer = require('./server')
const testRequest = require('./request')
const localSocket = require('./localsocket')

test('proxy server: simple routing', function (t) {
  const testSocket1 = localSocket('test.socket')
  const testSocket2 = localSocket('test2.socket')
  const proxySocket = localSocket('proxy-test.socket')

  const testServer1 = testServer(testSocket1, {
    statusCode: '303',
    headers: { rad: 'totally' },
    body: "server1",
  })
  const testServer2 = testServer(testSocket2, {
    headers: {'content-type': 'food/doritos' },
    body: "server2",
  })

  const proxy = new Proxy({
    servers: [
      ['test.localhost', testSocket1],
      ['*', testSocket2]
    ]
  })

  const proxyServer = proxy.createServer(function (req, res, next) {
    req.headers['x-proxy'] = 'ti-83'
    return next()
  })

  proxyServer.listen(proxySocket)
  proxyServer.unref && proxyServer.unref()

  const path = '/stuff?opt=yah'

  t.plan(12)
  testRequest({
    socketPath: proxySocket,
    path: path,
    hostname: 'test.localhost',
    method: 'GET',
  }, function (proxyRes, requestHeaders, responseHeaders, statusCode) {
    t.same(statusCode, '303', 'should get right status')
    t.same(responseHeaders['rad'], 'totally', 'correct header')
    t.same(requestHeaders['x-proxy'], 'ti-83', 'correct header')
    t.same(proxyRes.socketPath, testSocket1, 'correct socket')
    t.same(proxyRes.host, 'test.localhost', 'correct host')
    t.same(proxyRes.path, path, 'correct path')
  })

  const postData = Buffer('id=proxyproxyproxy')
  testRequest({
    socketPath: proxySocket,
    path: path,
    hostname: 'localhost.whatever.lol',
    method: 'POST',
    postData: postData,
  }, function (proxyRes, requestHeaders, responseHeaders) {
    t.same(proxyRes.postData, postData.toString(), 'correct post data')
    t.same(requestHeaders['x-proxy'], 'ti-83', 'correct header')
    t.same(responseHeaders['content-type'], 'food/doritos', 'correct header')
    t.same(proxyRes.socketPath, testSocket2, 'correct socket')
    t.same(proxyRes.host, 'localhost.whatever.lol', 'correct host')
    t.same(proxyRes.path, path, 'correct path')
  })
})
