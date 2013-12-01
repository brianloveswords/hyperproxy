const Proxy = require('..')
const test = require('tap').test
const testServer = require('./server')
const testRequest = require('./request')
const localSocket = require('./localsocket')

test('proxy server: complex routing', function (t) {
  const servers = {
    json: makeServer('json'),
    xml: makeServer('xml'),
    dot: makeServer('dotpath'),
    default: makeServer('default'),
  }

  const proxySocket = localSocket('proxy-test.socket')

  const serverDefs = [
    ['test.localhost', [
      ['/api/*.json', servers.json.socket],
      ['/api/*.xml', servers.xml.socket],
      ['/.*', servers.dot.socket],
      {pattern: '*', endpoint: servers.default.socket},
    ]],
  ]

  const proxy = new Proxy({ servers: serverDefs })

  const proxyServer = proxy
    .createServer()
    .listen(proxySocket)
  proxyServer.unref && proxyServer.unref()

  t.plan(4)
  testRequest({
    socketPath: proxySocket,
    path: '/api/x/y/z.json',
    hostname: 'test.localhost',
    method: 'GET',
  }, function (proxyRes) {
    t.same(proxyRes.socketPath, servers.json.socket, 'should json')
  })

  testRequest({
    socketPath: proxySocket,
    path: '/api/v2/lol/rattleskates.xml',
    hostname: 'test.localhost',
    method: 'GET',
  }, function (proxyRes) {
    t.same(proxyRes.socketPath, servers.xml.socket, 'should xml')
  })

  testRequest({
    socketPath: proxySocket,
    path: '/.link',
    hostname: 'test.localhost',
    method: 'GET',
  }, function (proxyRes) {
    t.same(proxyRes.socketPath, servers.dot.socket, 'should dot')
  })

  testRequest({
    socketPath: proxySocket,
    path: '/literally/anything/else',
    hostname: 'test.localhost',
    method: 'GET',
  }, function (proxyRes) {
    t.same(proxyRes.socketPath, servers.default.socket, 'should default')
  })

})


function makeServer(name) {
  return testServer(localSocket(name + '.socket'))
}
