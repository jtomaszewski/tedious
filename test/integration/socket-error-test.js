// @ts-check

const fs = require('fs');
const { assert } = require('chai');

import Connection from '../../src/connection';
import Request from '../../src/request';
import { debugOptionsFromEnv } from '../helpers/debug-options-from-env';

function getConfig() {
  const config = JSON.parse(
    fs.readFileSync(require('os').homedir() + '/.tedious/test-connection.json', 'utf8')
  ).config;

  config.options.debug = debugOptionsFromEnv();

  config.options.tdsVersion = process.env.TEDIOUS_TDS_VERSION;

  return config;
}

/**
 * @typedef {import('net').Socket} Socket
 */

describe('A `error` on the network socket', function() {
  /** @type {Connection} */
  let connection;

  beforeEach(function(done) {
    this.timeout(5000);

    connection = new Connection(getConfig());
    connection.on('error', done);
    if (process.env.TEDIOUS_DEBUG) {
      connection.on('debug', console.log);
    }
    connection.connect((err) => {
      connection.removeListener('error', done);
      done(err);
    });
  });

  afterEach(function() {
    connection.close();
  });

  it('forwards the error to in-flight requests', function(done) {
    const socketError = new Error('socket error');
    connection.on('error', () => {});

    const request = new Request('WAITFOR 00:00:30', function(err) {
      assert.strictEqual(err, socketError);

      done();
    });

    connection.execSql(request);
    process.nextTick(() => {
      /** @type {Socket} */(connection.socket).destroy(socketError);
    });
  });

  it('calls the request completion callback after closing the connection', function(done) {
    const socketError = new Error('socket error');
    connection.on('error', () => {});

    const request = new Request('WAITFOR 00:00:30', function(err) {
      assert.strictEqual(connection.closed, true);

      done();
    });

    connection.execSql(request);
    process.nextTick(() => {
      /** @type {Socket} */(connection.socket).destroy(socketError);
    });
  });

  it('calls the request completion callback after emitting the `end` event', function(done) {
    const socketError = new Error('socket error');
    connection.on('error', () => {});

    let endEmitted = false;
    connection.on('end', () => {
      endEmitted = true;
    });

    const request = new Request('WAITFOR 00:00:30', function(err) {
      assert.strictEqual(endEmitted, true);
      done();
    });

    connection.execSql(request);
    process.nextTick(() => {
      /** @type {Socket} */(connection.socket).destroy(socketError);
    });
  });
});
