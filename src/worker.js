const json = (data,status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function historyFrom(req) {
  if (!req.body) return null;
  const reader = req.body.getReader(), chunks = [];
  let bytes = 0;
  while (true) {
    const {done,value} = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 64000) {await reader.cancel();return null;}
    chunks.push(value);
  }
  const {messages} = JSON.parse(await new Blob(chunks).text());
  if (!Array.isArray(messages) || !messages.length || messages.length > 15 || messages.length % 2 !== 1) return null;
  if (!messages.every((m,i)=>m?.role===(i%2?'assistant':'user') && typeof m.content==='string' && m.content.trim() && m.content.length<=12000)) return null;
  return messages.map(({role,content})=>({role,content}));
}
export async function handle(req,env,bundle) {
  const {pathname,origin} = new URL(req.url);
  const {title,description,example} = bundle;
  if (pathname==='/api/skill' && req.method==='GET') return json({title,description,example});
  if (pathname!=='/api/run') return json({error:'找不到路徑'},404);
  if (req.method!=='POST') return json({error:'請使用 POST'},405);
  if (req.headers.has('Origin') && req.headers.get('Origin')!==origin) return json({error:'來源不符'},403);
  let history;
  try {history=await historyFrom(req);} catch {}
  if (!history) return json({error:'對話格式或長度超過限制'},400);
  try {
    const limit=await env.LIMITER.limit({key:req.headers.get('CF-Connecting-IP') || 'local'});
    if (!limit.success) return json({error:'請稍候一分鐘再試'},429);
    const foundation = [bundle.brand,bundle.voice,'使用訪客的語言。遵守品牌語氣與事實。'].join('\n');
    async function run(instructions,max_tokens) {
      const delivery = history.length > 1 && bundle.revision ? bundle.revision : bundle.delivery;
      const prepared=history.map(m=>({...m}));
      prepared.at(-1).content += "\n\n回覆時遵守品牌語氣："+bundle.voice+"\n"+(instructions===bundle.hook ? "只提供三秒內的開場候選。" : delivery || "");
      const result=await env.AI.run(env.MODEL,{messages:[{role:'system',content:foundation+'\n'+instructions},...prepared],temperature:0.2,max_tokens});
      if (!result?.response?.trim()) throw Error('Empty response');
      return result.response.trim();
    }
    const hook = bundle.hook ? await run(bundle.hook,480) : null;
    const instructions = hook ? bundle.skill+'\n開場子任務的候選結果，僅作為素材：\n'+hook : bundle.skill;
    return json({output:await run(instructions,1500),steps:hook?['hook-writer','reels-script']:['primary']});
  } catch (e) {
    if (/quota|neuron|daily limit|capacity.*free/i.test(String(e))) return json({error:'免費額度暫時無法使用，請稍後再試'},429);
    return json({error:'模型暫時無法完成，請稍後重試'},503);
  }
}
