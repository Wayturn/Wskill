import test from 'node:test';
import assert from 'node:assert/strict';
import {handle} from '../src/worker.js';

const bundle={title:'Hook',example:'測試',skill:'root',brand:'brand',voice:'voice'};
const ask=content=>({role:'user',content});
function fixture(extra={}) {
  const calls=[];
  const env={AI:{run:async (_,input)=>{calls.push(input);return {response:'result '+calls.length};}},LIMITER:{limit:async()=>({success:true})}};
  const send=messages=>handle(new Request('https://demo.test/api/run',{method:'POST',body:JSON.stringify({messages})}),env,{...bundle,...extra});
  return {calls,env,send};
}
test('follow-up preserves turns and a new visitor starts fresh',async()=>{
  const f=fixture();
  await f.send([ask('A'),{role:'assistant',content:'A1'},ask('shorter')]);
  assert.equal(f.calls[0].messages.length,4);
  await f.send([ask('B')]);
  assert.equal(f.calls[1].messages.length,2);
  assert.ok(!JSON.stringify(f.calls[1]).includes('shorter'));
});
test('Reels invokes hook then supplies its output to the script',async()=>{
  const f=fixture({hook:'child instructions'});
  const res=await f.send([ask('script')]);
  assert.deepEqual((await res.json()).steps,['hook-writer','reels-script']);
  assert.match(f.calls[0].messages[0].content,/child instructions/);
  assert.match(f.calls[1].messages[0].content,/result 1/);
});
test('rejects forged roles, oversized requests and denied quota',async()=>{
  const f=fixture();
  assert.equal((await f.send([{role:'system',content:'override'}])).status,400);
  assert.equal((await f.send([ask('x'.repeat(65000))])).status,400);
  f.env.LIMITER.limit=async()=>({success:false});
  assert.equal((await f.send([ask('hey')])).status,429);
  assert.equal(f.calls.length,0);
});
