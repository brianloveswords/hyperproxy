const Proxy = require('..')
const path = require('path')
const test = require('tap').test
const testServer = require('./server')
const testRequest = require('./request')

test('proxy server: simple routing', function (t) {
  const testSocket1 = localSocket('test.socket')
  const testSocket2 = localSocket('test2.socket')

  const testServer1 = testServer(testSocket1)
  const testServer2 = testServer(testSocket2)

  const proxy = new Proxy({
    socket: localSocket('proxy-test.socket'),
    servers: [
      ['test.localhost', testSocket1],
      ['test2.localhost', testSocket2]
    ]
  })

  const gateway = proxy.createServer(function (req, res, next) {
    req.headers['x-proxy'] = 'ti-83'
    return next()
  })
  gateway.unref()

  const path = '/stuff?opt=yah'

  t.plan(8)
  testRequest(proxy, {
    path: path,
    host: 'test.localhost',
    method: 'GET',
  }, function (proxyRes) {
    t.same(proxyRes.headers['x-proxy'], 'ti-83', 'correct header')
    t.same(proxyRes.socket, testSocket1, 'correct socket')
    t.same(proxyRes.host, 'test.localhost', 'correct host')
    t.same(proxyRes.path, path, 'correct path')
  })

  testRequest(proxy, {
    path: path,
    host: 'test2.localhost',
    method: 'GET',
  }, function (proxyRes) {
    t.same(proxyRes.headers['x-proxy'], 'ti-83', 'correct header')
    t.same(proxyRes.socket, testSocket2, 'correct socket')
    t.same(proxyRes.host, 'test2.localhost', 'correct host')
    t.same(proxyRes.path, path, 'correct path')
  })
})

function exec(method) { return function (obj) { obj[method]() } }
function localSocket(file) {
  return path.join(__dirname, 'sockets', file)
}
