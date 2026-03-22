const { describe, it } = require('node:test');
const assert = require('node:assert');
const { SilkWeb } = require('../src/index.js');

describe('SilkWeb', () => {
  it('should throw without apiKey', () => {
    assert.throws(() => new SilkWeb({}), /apiKey is required/);
  });

  it('should throw with invalid apiKey prefix', () => {
    assert.throws(() => new SilkWeb({ apiKey: 'invalid_key' }), /must start with sw_live_/);
  });

  it('should create client with valid apiKey', () => {
    const silk = new SilkWeb({ apiKey: 'sw_live_' + '0'.repeat(64) });
    assert.ok(silk);
    assert.strictEqual(silk.silkId, null);
  });

  it('should accept test apiKey', () => {
    const silk = new SilkWeb({ apiKey: 'sw_test_' + '0'.repeat(64) });
    assert.ok(silk);
  });

  it('should accept custom baseUrl', () => {
    const silk = new SilkWeb({
      apiKey: 'sw_live_' + '0'.repeat(64),
      baseUrl: 'https://custom-api.example.com',
    });
    assert.strictEqual(silk.baseUrl, 'https://custom-api.example.com');
  });

  it('should throw on register without agent name', async () => {
    const silk = new SilkWeb({ apiKey: 'sw_live_' + '0'.repeat(64) });
    await assert.rejects(() => silk.register({}), /must have at least a name/);
  });

  it('should throw on requestTask without required fields', async () => {
    const silk = new SilkWeb({ apiKey: 'sw_live_' + '0'.repeat(64) });
    await assert.rejects(
      () => silk.requestTask({ to: 'sw_123' }),
      /requires to, capability, and input/
    );
  });

  it('should map tools to capabilities', () => {
    const silk = new SilkWeb({ apiKey: 'sw_live_' + '0'.repeat(64) });
    const tools = [
      { name: 'Web Search', description: 'Search the web for information' },
      { name: 'Data Analysis', description: 'Analyze datasets and produce insights' },
    ];
    const caps = silk._mapToolsToCapabilities(tools);

    assert.strictEqual(caps.length, 2);
    assert.strictEqual(caps[0].id, 'web-search');
    assert.strictEqual(caps[0].name, 'Web Search');
    assert.strictEqual(caps[1].id, 'data-analysis');
  });

  it('should extract tags from description', () => {
    const silk = new SilkWeb({ apiKey: 'sw_live_' + '0'.repeat(64) });
    const tags = silk._extractTags('Deep research and analysis on complex topics');

    assert.ok(tags.includes('deep'));
    assert.ok(tags.includes('research'));
    assert.ok(tags.includes('analysis'));
    // Stop words should be excluded
    assert.ok(!tags.includes('and'));
    assert.ok(!tags.includes('on'));
  });
});
