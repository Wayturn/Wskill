const el=id=>document.getElementById(id);
const history=[];
function show(role,content) {
  const p=document.createElement('p');
  p.className='turn '+role;
  p.textContent=content;
  el('chat').append(p);
}
let ready=false, busy=false;
function lock() {
  el('send').disabled=el('sample').disabled=!ready || busy;
  el('input').readOnly=busy;
}
async function send(content) {
  if (!content || busy || !ready) return;
  busy=true;lock();
  el('status').textContent='正在處理…';
  const user={role:'user',content};
  try {
    const res=await fetch('/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[...history.slice(-4),user]})});
    const result=await res.json();
    if (!res.ok) throw Error(result.error);
    history.push(user,{role:'assistant',content:result.output});
    show('user',content);show('assistant',result.output);
    el('input').value='';el('status').textContent='';
  } catch (e) {el('status').textContent=e.message;}
  finally {busy=false;lock();el('input').focus();}
}
document.querySelector('form').onsubmit=e=>{e.preventDefault();send(el('input').value.trim());};
try {
  const res=await fetch('/api/skill');
  if (!res.ok) throw Error();
  const skill=await res.json();
  document.title=el('title').textContent=skill.title;
  el('desc').textContent=skill.description;
  el('sample').onclick=()=>send(skill.example);
  ready=true;lock();
} catch {el('status').textContent='載入失敗，請重新整理。';}
