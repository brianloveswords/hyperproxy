const Proxy = require('..')
const test = require('tap').test
const testServer = require('./server')
const testRequest = require('./request')
const localSocket = require('./localSocket')

test('proxy server: simple routing', function (t) {
  const servers = {
    food: makeServer('food'),
    music: makeServer('music'),
    dot: makeServer('dotpath'),
    default: makeServer('default'),
  }

  const proxySocket = localSocket('proxy-test.socket')

  const serverDefs = [
    ['test.localhost', [
      ['/food/*', servers.food.socket],
      ['/music/*', servers.music.socket],
      ['/.*', servers.dot.socket],
      ['*', servers.default.socket],
    ]],
  ]

  const proxy = new Proxy({ servers: serverDefs })

  const gateway = proxy
    .createServer()
    .listen(proxySocket)

  gateway.unref()

  t.plan(4)
  testRequest({
    socketPath: proxySocket,
    path: '/food/sandwiches/blt',
    host: 'test.localhost',
    method: 'GET',
  }, function (proxyRes) {
    t.same(proxyRes.socketPath, servers.food.socket, 'should food')
  })

  testRequest({
    socketPath: proxySocket,
    path: '/music/himalaya/',
    host: 'test.localhost',
    method: 'GET',
  }, function (proxyRes) {
    t.same(proxyRes.socketPath, servers.music.socket, 'should music')
  })

  testRequest({
    socketPath: proxySocket,
    path: '/.link',
    host: 'test.localhost',
    method: 'GET',
  }, function (proxyRes) {
    t.same(proxyRes.socketPath, servers.dot.socket, 'should dot')
  })

  testRequest({
    socketPath: proxySocket,
    path: '/literally/anything/else',
    host: 'test.localhost',
    method: 'GET',
  }, function (proxyRes) {
    t.same(proxyRes.socketPath, servers.default.socket, 'should default')
  })

})


function makeServer(name) {
  return testServer(localSocket(name + '.socket'))
}
