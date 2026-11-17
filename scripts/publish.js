import {readFileSync, writeFileSync, mkdirSync, cpSync} from 'node:fs';
import {dirname, resolve, basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const [, , manifest, mode = '--build'] = process.argv;
if (!manifest || !['--build','--deploy'].includes(mode)) throw Error('Usage: npm run publish-skill -- path/to/publish.json [--build|--deploy]');
const dir = dirname(resolve(manifest));
const read = file => readFileSync(resolve(dir,file),'utf8');
const settings = JSON.parse(read(manifest.startsWith('/') ? manifest : basename(manifest)));
if (!/^[a-z][a-z0-9-]{1,55}$/.test(settings.worker)) throw Error('Invalid Worker name');
for (const key of ['title','description','example','skill','brand','voice']) {
  if (typeof settings[key] !== 'string' || !settings[key].trim()) throw Error('Missing '+ key);
}

function loadSkill(path) {
  const source = read(resolve(dir,path,'SKILL.md'));
  const refs = [...new Set(source.match(/references\/[\w.-]+\.md/g) || [])];
  return [source,...refs.map(ref => ref+'\n'+read(resolve(dir,path,ref)))].join('\n\n');
}
const skill = loadSkill(settings.skill);
if (/Use `hook-writer`/i.test(skill) && !settings.hook) throw Error('Missing hook-writer dependency: configure hook');
const bundle = {title:settings.title,description:settings.description,example:settings.example,
  skill, delivery:settings.delivery || "", brand:read(settings.brand), voice:read(settings.voice),hook:settings.hook ? loadSkill(settings.hook) : null};
const target = resolve(root,'.build',settings.worker);
mkdirSync(target,{recursive:true});
cpSync(resolve(root,'public'),resolve(target,'public'),{recursive:true});
cpSync(resolve(root,'src/worker.js'),resolve(target,'worker.js'));
writeFileSync(resolve(target,'bundle.json'),JSON.stringify(bundle));
writeFileSync(resolve(target,'index.js'),"import bundle from './bundle.json'; import {handle} from './worker.js'; export default {fetch(req,env){return handle(req,env,bundle)}};");
writeFileSync(resolve(target,'wrangler.json'),JSON.stringify({
  name:settings.worker, main:'index.js', compatibility_date:'2026-11-01',workers_dev:true,
  assets:{directory:'public'}, ai:{binding:'AI'}, vars:{MODEL:'@cf/meta/llama-3.3-70b-instruct-fp8-fast'},
  ratelimits:[{name:'LIMITER',namespace_id:settings.hook?'7102':'7101',simple:{limit:5,period:60}}]
},null,2));
const bin = resolve(root,'node_modules/.bin/wrangler');
execFileSync(bin,['deploy',...(mode==='--build'?['--dry-run']:[])],{cwd:target,stdio:'inherit'});
