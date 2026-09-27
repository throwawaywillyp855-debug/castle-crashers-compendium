import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{retrieve} from '../worker/index.js';
const env={SITE_ORIGIN:'https://example.github.io',OPENAI_API_KEY:'test-key'};
const request=(question,origin=env.SITE_ORIGIN)=>new Request('https://api.example.workers.dev/ask',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({question})});
test('retrieval identifies a supported question and rejects unrelated subject',()=>{
  assert.equal(retrieve('How many players can play?')[0].id,'coop');
  assert.deepEqual(retrieve('What is the developer favorite dessert?'),[]);
});
test('unsupported question does not contact AI',async()=>{
  const previous=globalThis.fetch;globalThis.fetch=()=>{throw Error('Unexpected AI call');};
  try {const response=await worker.fetch(request('What is the developer favorite dessert?'),env);const data=await response.json();assert.equal(data.grounded,false);assert.deepEqual(data.sources,[]);}
  finally {globalThis.fetch=previous;}
});
test('allowed question uses server selected source and blocks other origins',async()=>{
  const forbidden=await worker.fetch(request('How many players can play?','https://other.example'),env);assert.equal(forbidden.status,403);
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({output:[{content:[{type:'output_text',text:'Up to four players can play.'}]}]}),{status:200});
  try {const response=await worker.fetch(request('How many players can play?'),env);const data=await response.json();assert.equal(data.grounded,true);assert.equal(data.sources[0].id,'coop');assert.match(data.sources[0].url,/castlecrashers\.com/);}
  finally {globalThis.fetch=previous;}
});
