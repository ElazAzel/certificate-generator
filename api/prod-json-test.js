const BASE = 'https://certificate-generator-tawny.vercel.app';

(async () => {
  const headers = { 'Content-Type': 'application/json' };

  let r = await fetch(BASE + '/api/fonts/google', { method: 'POST', headers, body: JSON.stringify({ name: 'Roboto' }) });
  let t = await r.text();
  console.log('fonts/google:', r.status, t.slice(0, 200));

  r = await fetch(BASE + '/api/generate', { method: 'POST', headers, body: JSON.stringify({}) });
  t = await r.text();
  console.log('generate:', r.status, t.slice(0, 120));

  r = await fetch(BASE + '/api/generate/test', { method: 'POST', headers, body: JSON.stringify({}) });
  t = await r.text();
  console.log('generate/test:', r.status, t.slice(0, 120));

  r = await fetch(BASE + '/api/auth/login', { method: 'POST', headers, body: JSON.stringify({ password: '' }) });
  t = await r.text();
  console.log('auth/login:', r.status, t.slice(0, 120));
})().catch(e => console.error('FATAL', e.message));
