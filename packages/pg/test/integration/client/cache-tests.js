'use strict'
const assert = require('assert')
const helper = require('../test-helper')
const suite = new helper.Suite()
const { Client, Pool } = helper.pg
const dns = require('dns')

suite.test('DNS caching can be enabled', function () {
  const client = new Client({ dns_cache: { enable: true } })
  assert.strictEqual(client.connectionParameters.dns_cache.enable, true)
})

suite.test('DNS caching settings can be customized', function () {
  const client = new Client({
    dns_cache: {
      enable: true,
      ttl: 600,
      cachesize: 2000,
    },
  })
  assert.strictEqual(client.connectionParameters.dns_cache.enable, true)
  assert.strictEqual(client.connectionParameters.dns_cache.ttl, 600)
  assert.strictEqual(client.connectionParameters.dns_cache.cachesize, 2000)
})

suite.test('DNS lookup is not cached by default', function (done) {
  const pool = new Pool({ host: 'localhost' })
  const originalLookup = dns.lookup
  let lookupCount = 0

  dns.lookup = function () {
    lookupCount++
    originalLookup.apply(this, arguments)
  }

  pool.connect(function (err, client, release) {
    assert(!err)
    assert.equal(lookupCount, 1)

    pool.connect(function (err, client, release) {
      assert(!err)
      assert.equal(lookupCount, 2)

      dns.lookup = originalLookup
      release()
      pool.end(done)
    })

    release()
  })
})

suite.test('DNS cache can be enabled and respects TTL', function (done) {
  const pool = new Pool({
    host: 'localhost',
    dns_cache: {
      enable: true,
      ttl: 1, // Set TTL to 1 second for testing
      cachesize: 1000,
    },
  })
  const originalLookup = dns.lookup
  let lookupCount = 0

  dns.lookup = function () {
    lookupCount++
    originalLookup.apply(this, arguments)
  }

  pool.connect(function (err, client, release) {
    assert(!err)
    assert.equal(lookupCount, 1)

    setTimeout(function () {
      pool.connect(function (err, client, release) {
        assert(!err)
        assert.equal(lookupCount, 2)

        dns.lookup = originalLookup
        release()
        pool.end(done)
      })
    }, 1100)

    release()
  })
})