const { assert } = require('chai');
const net = require('net');
const Connection = require('../../src/tedious').Connection;
const ConnectionError = require('../../src/errors').ConnectionError;

describe('Connecting to a server that sends invalid packet data', function() {
  let server;

  beforeEach(function(done) {
    server = net.createServer();
    server.listen(0, '127.0.0.1', done);
  });

  afterEach(function(done) {
    server.close(done);
    server.emit('close');
  });

  it('should throw Connection Error ', function(done) {
    server.on('connection', (socket) => {
      const packetData = Buffer.from('test1234');
      const packetHeader = Buffer.alloc(8);
      let offset = 0;
      offset = packetHeader.writeUInt8(0x11, offset);
      offset = packetHeader.writeUInt8(0x01, offset);
      offset = packetHeader.writeUInt16BE(5, offset);
      offset = packetHeader.writeUInt16BE(0x0000, offset);
      offset = packetHeader.writeUInt8(1, offset);
      packetHeader.writeUInt8(0x00, offset);
      const packet = Buffer.concat([packetHeader, packetData]);
      socket.write(packet);
    });
    const addressInfo = server.address();
    const connection = new Connection({
      server: addressInfo.address,
      options: {
        port: addressInfo.port,
      }
    });

    connection.connect((err) => {
      assert.instanceOf(err, ConnectionError);
      assert.equal(err.message, 'Connection lost - Unable to process incoming packet');
      done();
    });
  });
});
