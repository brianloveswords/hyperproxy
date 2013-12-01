const fs = require('fs')
const path = require('path')
const testServer = require('./server')
const localSocket = require('./localsocket')
const xtend = require('xtend')

module.exports = {
  gnarly: new Server('gnarly'),
  tubular: new Server('tubular'),
  wayCool: new Server('wayCool'),
  awesome: new Server('awesome'),
  groovy: new Server('groovy'),
  mondo: new Server('mondo'),
  outrageous: new Server('outrageous'),
  funky: new Server('funky'),
}

function Server(name) {
  this.name = name
  this.socket = localSocket(name + '.sock')
}

Server.prototype.tlsOptions = function () {
  const cert = this.name + '.localhost.crt'
  const opts =  {
    key: fs.readFileSync(path.join(__dirname, 'cert', 'ia.key')),
    cert: fs.readFileSync(path.join(__dirname, 'cert', cert)),
  }
  console.dir(opts)
  return opts
}

Server.prototype.start = function (opts) {
  this.server = testServer(this.socket, this.options(opts))
  return this.socket
}

Server.prototype.options = function (opts) {
  return xtend({
    statusCode: '200',
    headers: {
      'x-server-name': this.name,
      'x-server-socket': this.socket,
    },
    body: this.message()
  }, opts)
}

Server.prototype.message = function () {
  return 'totally ' + this.name + ' bro.'
}
