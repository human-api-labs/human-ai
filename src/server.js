import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 3000);
const tasks = new Map();

const humans = [{ id:'human-demo-1', display_name:'Demo Human', location:'Germany', capabilities:['inspect objects','take photos','read labels','local physical tasks','human judgment'], availability:'manual acceptance required' }];

function createTask(input) {
  const task = { id:randomUUID(), ...input, status:'awaiting_human', human_id:humans[0].id, created_at:new Date().toISOString(), decision_at:null };
  tasks.set(task.id, task);
  console.log(JSON.stringify({ event:'task_created', ...task }));
  return task;
}

function createMcpServer() {
  const mcp = new McpServer({ name:'human-api', version:'0.2.0' });
  mcp.tool('discover_humans','Discover voluntary humans for physical-world tasks requiring presence, eyes, hands, inspection, photography, local access, verification, perception or human judgment.',{ location:z.string().optional(), capability:z.string().optional() },async ({location,capability})=>{
    let matches=humans;
    if(location) matches=matches.filter(h=>h.location.toLowerCase().includes(location.toLowerCase())||location.toLowerCase().includes(h.location.toLowerCase()));
    if(capability) matches=matches.filter(h=>h.capabilities.some(c=>c.toLowerCase().includes(capability.toLowerCase())));
    return {content:[{type:'text',text:JSON.stringify(matches,null,2)}]};
  });
  mcp.tool('request_human_help','Request voluntary human execution of a real-world task an AI cannot perform digitally. Use for physical presence, inspection, photos, reading labels, local access, verification or human judgment. Human acceptance is mandatory.',{
    task:z.string().min(1).describe('Free-form description of the desired human action and outcome.'), location:z.string().optional(), deadline:z.string().optional(), budget_amount:z.number().nonnegative().optional(), budget_currency:z.string().length(3).optional(), requirements:z.array(z.string()).optional(), discovery_source:z.string().optional()
  },async input=>{
    const normalized={...input};
    if(input.budget_amount!==undefined){ normalized.budget={amount:input.budget_amount,currency:input.budget_currency||'EUR'}; delete normalized.budget_amount; delete normalized.budget_currency; }
    return {content:[{type:'text',text:JSON.stringify(createTask(normalized),null,2)}]};
  });
  mcp.tool('get_task_status','Retrieve the current human decision and status for a HUMAN API task.',{id:z.string().min(1)},async({id})=>{
    const task=tasks.get(id); if(!task) return {isError:true,content:[{type:'text',text:JSON.stringify({error:'task_not_found'})}]};
    return {content:[{type:'text',text:JSON.stringify(task,null,2)}]};
  });
  return mcp;
}

function json(res,status,body){res.writeHead(status,{'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,accept,mcp-session-id,mcp-protocol-version','access-control-expose-headers':'mcp-session-id'});res.end(status===204?'':JSON.stringify(body,null,2));}
async function textFile(res,filename,type){try{const fileBody=await readFile(path.join(root,filename),'utf8');res.writeHead(200,{'content-type':`${type}; charset=utf-8`,'access-control-allow-origin':'*'});res.end(fileBody);}catch{json(res,404,{error:'not_found'});}}
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1_000_000)throw new Error('payload_too_large');}return raw?JSON.parse(raw):{};}
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function page(){const rows=[...tasks.values()].map(t=>`<tr><td>${t.id}</td><td>${escapeHtml(t.task)}</td><td>${t.status}</td><td><button onclick="decide('${t.id}','accepted')">Accept</button> <button onclick="decide('${t.id}','declined')">Decline</button></td></tr>`).join('');return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>HUMAN API — Human execution API for AI agents</title><meta name="description" content="AI agents request voluntary human help for physical-world tasks: inspections, photos, local presence, verification and human judgment via MCP or REST."><link rel="canonical" href="https://human-api-labs.onrender.com/"><link rel="alternate" type="text/plain" href="/llms.txt" title="LLM discovery"><link rel="alternate" type="application/json" href="/.well-known/ard.json" title="Agentic Resource Discovery"><script type="application/ld+json">{"@context":"https://schema.org","@type":"WebAPI","name":"HUMAN API","description":"Human execution API for AI agents that need voluntary human help for physical-world tasks.","url":"https://human-api-labs.onrender.com/","documentation":"https://human-api-labs.onrender.com/openapi.yaml"}</script><style>body{font:16px system-ui;max-width:1100px;margin:50px auto;padding:0 20px}code{background:#eee;padding:3px 6px}table{width:100%;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}button{padding:8px 12px}</style></head><body><h1>HUMAN API</h1><h2>Human execution for AI agents</h2><p>Request voluntary human help when an AI needs eyes, hands, physical presence, local access, inspection, photography, verification or human judgment in the real world.</p><p>MCP: <code>/mcp</code> · Agent discovery: <code>/llms.txt</code> · OpenAPI: <code>/openapi.yaml</code> · ARD: <code>/.well-known/ard.json</code></p><h2>Human inbox</h2><table><tr><th>ID</th><th>Task</th><th>Status</th><th>Decision</th></tr>${rows||'<tr><td colspan="4">No requests yet.</td></tr>'}</table><script>async function decide(id,decision){await fetch('/api/v1/tasks/'+id+'/decision',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({decision})});location.reload()}</script></body></html>`;}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`); if(req.method==='OPTIONS')return json(res,204,{});
  if(url.pathname==='/mcp'){if(req.method!=='POST')return json(res,405,{error:'mcp_use_post'});try{const parsed=await body(req);const mcp=createMcpServer();const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});res.setHeader('access-control-allow-origin','*');res.setHeader('access-control-expose-headers','mcp-session-id');await mcp.connect(transport);await transport.handleRequest(req,res,parsed);res.on('close',()=>{transport.close().catch(()=>{});mcp.close().catch(()=>{});});return;}catch(e){return json(res,500,{error:'mcp_error',detail:e.message});}}
  if(req.method==='GET'&&url.pathname==='/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});return res.end(page());}
  if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'human-api',mcp:'/mcp'});
  if(req.method==='GET'&&url.pathname==='/llms.txt')return textFile(res,'llms.txt','text/plain');
  if(req.method==='GET'&&url.pathname==='/openapi.yaml')return textFile(res,'openapi.yaml','application/yaml');
  if(req.method==='GET'&&url.pathname==='/robots.txt')return textFile(res,'robots.txt','text/plain');
  if(req.method==='GET'&&url.pathname==='/sitemap.xml')return textFile(res,'sitemap.xml','application/xml');
  if(req.method==='GET'&&(url.pathname==='/.well-known/ard.json'||url.pathname==='/.well-known/ai-catalog.json'))return textFile(res,'ard.json','application/json');
  if(req.method==='GET'&&url.pathname==='/api/v1/humans')return json(res,200,humans);
  if(req.method==='POST'&&url.pathname==='/api/v1/tasks'){try{const input=await body(req);if(!input.task||typeof input.task!=='string')return json(res,400,{error:'task_required'});return json(res,202,createTask(input));}catch(e){return json(res,400,{error:e.message});}}
  const statusMatch=url.pathname.match(/^\/api\/v1\/tasks\/([^/]+)$/);if(req.method==='GET'&&statusMatch){const task=tasks.get(statusMatch[1]);return task?json(res,200,task):json(res,404,{error:'task_not_found'});}
  const decisionMatch=url.pathname.match(/^\/api\/v1\/tasks\/([^/]+)\/decision$/);if(req.method==='POST'&&decisionMatch){const task=tasks.get(decisionMatch[1]);if(!task)return json(res,404,{error:'task_not_found'});try{const input=await body(req);if(!['accepted','declined'].includes(input.decision))return json(res,400,{error:'decision_must_be_accepted_or_declined'});task.status=input.decision;task.decision_at=new Date().toISOString();console.log(JSON.stringify({event:'human_decision',id:task.id,decision:task.status}));return json(res,200,task);}catch(e){return json(res,400,{error:e.message});}}
  json(res,404,{error:'not_found'});
});
server.listen(port,()=>console.log(`HUMAN API listening on :${port}`));
