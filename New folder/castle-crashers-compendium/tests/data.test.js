import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const facts = JSON.parse(readFileSync(new URL('../facts.json',import.meta.url)));
test('MVP facts are sourced, unique, and numerous enough', () => {
  assert.ok(facts.length >= 25);
  assert.equal(new Set(facts.map(f => f.id)).size,facts.length);
  for (const fact of facts) {
    assert.ok(fact.id && fact.category && fact.title && fact.fact && fact.keywords.length);
    assert.equal(new URL(fact.source).protocol,'https:');
  }
});
test('website loads configuration, data, and question interface', () => {
  const html = readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/id="question"/);assert.match(html,/src="config.js"/);assert.match(html,/src="app-v2.js"/);
  assert.match(html,/id="music"[^>]+loop/);
});
