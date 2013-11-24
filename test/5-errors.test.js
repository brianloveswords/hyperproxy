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

  const opts = {
    socketPath: proxySocket,
    path: '/api/x/y/z.json',
    hostname: 'test.localhost',
    method: 'GET',
    json: false,
  }

  server.once('proxyMiss', function (req, res, handleError) {
    console.log('yep, missed')
    handleError()
  });

  testRequest(opts, function (proxyRes) {
    t.same(proxyRes.toString(), 'Bad Gateway')

    const msg = 'proxy miss'
    server.on('proxyMiss', function (req, res) {
      res.writeHead(502)
      res.end(msg)
    })
    testRequest(opts, function (proxyRes) {
      t.same(proxyRes.toString(), msg)
      t.end()
    })
  })

})

test('dead socket', function (t) {
  const proxySocket = localSocket('proxy-test.socket')
  const server = new Proxy({ servers: [
    ['*', localSocket('intentinally-dead.socket')]
  ]}).createServer().listen(proxySocket)

  server.unref()

  const opts = {
    socketPath: proxySocket,
    path: '/api/x/y/z.json',
    hostname: 'test.localhost',
    method: 'GET',
    json: false,
  }

  testRequest(opts, function (proxyRes) {
    t.same(proxyRes.toString(), 'Bad Gateway')

    const msg = 'missing socket'
    server.on('missingSocketFile', function (req, res) {
      res.writeHead(502)
      res.end(msg)
    })
    testRequest(opts, function (proxyRes) {
      t.same(proxyRes.toString(), msg)
      t.end()
    })
  })

})

test('missing remote host', function (t) {
  const proxySocket = localSocket('proxy-test.socket')
  const server = new Proxy({ servers: [
    ['*', 'some.site-that.does-not.exist:9990']
  ]}).createServer().listen(proxySocket)

  server.unref()

  const opts = {
    socketPath: proxySocket,
    path: '/api/x/y/z.json',
    hostname: 'test.localhost',
    method: 'GET',
    json: false,
  }

  testRequest(opts, function (proxyRes) {
    t.same(proxyRes.toString(), 'Bad Gateway')

    const msg = 'missing host'
    server.on('hostNotFound', function (req, res) {
      res.writeHead(502)
      res.end(msg)
    })
    testRequest(opts, function (proxyRes) {
      t.same(proxyRes.toString(), msg)
      t.end()
    })
  })

})
