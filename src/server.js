import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 3000);
const tasks = new Map();

const humans = [{
  id: 'human-demo-1',
  display_name: 'Demo Human',
  location: 'Germany',
  capabilities: ['inspect objects', 'take photos', 'read labels', 'local physical tasks', 'human judgment'],
  availability: 'manual acceptance required'
}];

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify(body, null, 2));
}

async function textFile(res, filename, type) {
  try {
    const body = await readFile(path.join(root, filename), 'utf8');
    res.writeHead(200, { 'content-type': `${type}; charset=utf-8` });
    res.end(body);
  } catch { json(res, 404, { error: 'not_found' }); }
}

async function body(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new Error('payload_too_large');
  }
  return raw ? JSON.parse(raw) : {};
}

function page() {
  const rows = [...tasks.values()].map(t => `<tr><td>${t.id}</td><td>${escapeHtml(t.task)}</td><td>${t.status}</td><td><button onclick="decide('${t.id}','accepted')">Accept</button> <button onclick="decide('${t.id}','declined')">Decline</button></td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>HUMAN API</title><style>body{font:16px system-ui;max-width:1100px;margin:50px auto;padding:0 20px}code{background:#eee;padding:3px 6px}table{width:100%;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}button{padding:8px 12px}</style></head><body><h1>HUMAN API</h1><p>A public interface for AI agents that need a human in the physical world.</p><p>Agent discovery: <code>/llms.txt</code> · API: <code>/openapi.yaml</code></p><h2>Human inbox</h2><table><tr><th>ID</th><th>Task</th><th>Status</th><th>Decision</th></tr>${rows || '<tr><td colspan="4">No requests yet.</td></tr>'}</table><script>async function decide(id,decision){await fetch('/api/v1/tasks/'+id+'/decision',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({decision})});location.reload()}</script></body></html>`;
}
function escapeHtml(s='') { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method === 'GET' && url.pathname === '/') { res.writeHead(200, {'content-type':'text/html; charset=utf-8'}); return res.end(page()); }
  if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true, service: 'human-api' });
  if (req.method === 'GET' && url.pathname === '/llms.txt') return textFile(res, 'llms.txt', 'text/plain');
  if (req.method === 'GET' && url.pathname === '/openapi.yaml') return textFile(res, 'openapi.yaml', 'application/yaml');
  if (req.method === 'GET' && url.pathname === '/api/v1/humans') return json(res, 200, humans);

  if (req.method === 'POST' && url.pathname === '/api/v1/tasks') {
    try {
      const input = await body(req);
      if (!input.task || typeof input.task !== 'string') return json(res, 400, { error: 'task_required' });
      const task = { id: randomUUID(), ...input, status: 'awaiting_human', human_id: humans[0].id, created_at: new Date().toISOString(), decision_at: null };
      tasks.set(task.id, task);
      console.log(JSON.stringify({ event: 'task_created', ...task }));
      return json(res, 202, task);
    } catch (e) { return json(res, 400, { error: e.message }); }
  }

  const statusMatch = url.pathname.match(/^\/api\/v1\/tasks\/([^/]+)$/);
  if (req.method === 'GET' && statusMatch) {
    const task = tasks.get(statusMatch[1]);
    return task ? json(res, 200, task) : json(res, 404, { error: 'task_not_found' });
  }

  const decisionMatch = url.pathname.match(/^\/api\/v1\/tasks\/([^/]+)\/decision$/);
  if (req.method === 'POST' && decisionMatch) {
    const task = tasks.get(decisionMatch[1]);
    if (!task) return json(res, 404, { error: 'task_not_found' });
    try {
      const input = await body(req);
      if (!['accepted','declined'].includes(input.decision)) return json(res, 400, { error: 'decision_must_be_accepted_or_declined' });
      task.status = input.decision; task.decision_at = new Date().toISOString();
      console.log(JSON.stringify({ event: 'human_decision', id: task.id, decision: task.status }));
      return json(res, 200, task);
    } catch (e) { return json(res, 400, { error: e.message }); }
  }

  json(res, 404, { error: 'not_found' });
});
server.listen(port, () => console.log(`HUMAN API listening on :${port}`));
