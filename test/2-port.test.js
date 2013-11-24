const Proxy = require('..')
const test = require('tap').test
const testServer = require('./server')
const testRequest = require('./request')
const localSocket = require('./localsocket')

if (process.env.NODE_ENV == 'travis') {
  console.log('skipping port test on travis')
  process.exit(0)
}

test('proxy server: simple routing with ports', function (t) {
  const proxySocket = localSocket('proxy-test.socket')
  const endpoint = testServer(':0')

  endpoint.on('listening', function () {
    const testPort = this.address().port
    const proxy = new Proxy({
      servers: [['test.localhost', ':'+testPort]]
    })

    const gateway = proxy.createServer(function (req, res, next) {
      req.headers['x-proxy'] = 'ti-83'
      return next()
    })

    gateway.listen(localSocket('proxy-test.socket'))
    gateway.unref()

    t.plan(1)
    testRequest({
      port: testPort,
      path: '/',
      hostname: 'test.localhost',
      method: 'GET',
    }, function (proxyRes) {
      console.dir(proxyRes)
      t.same(proxyRes.port, testPort, 'port')
    })
  })
})
