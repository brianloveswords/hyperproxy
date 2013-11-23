const Proxy = require('..')
const path = require('path')
const test = require('tap').test
const testServer = require('./server')
const testRequest = require('./request')

test('oh sup', function (t) {
  testServer('test.socket')
  testServer('test2.socket')

  const proxy = new Proxy({
    socket: localSocket('proxy-test.socket'),
    servers: [
      ['test.localhost', localSocket('test.socket')],
      ['test2.localhost', localSocket('test2.socket')]
    ]
  })

  const gateway = proxy.createServer(function (req, res, next) {
    req.headers['x-proxy'] = 'ti-83'
    return next()
  })

  gateway.unref()

  const path = '/stuff?opt=yah'

  testRequest(proxy, {
    path: path,
    host: 'test.localhost',
    method: 'GET',
  }, function (proxyRes) {

    t.same(proxyRes.headers['x-proxy'], 'ti-83')
    t.same(proxyRes.socket, localSocket('test.socket'), 'correct socket')
    t.same(proxyRes.host, 'test.localhost', 'correct host')
    t.same(proxyRes.path, path, 'correct path')

    t.end()
  })
})

function exec(method) { return function (obj) { obj[method]() } }
function localSocket(file) {
  return path.join(__dirname, 'sockets', file)
}
