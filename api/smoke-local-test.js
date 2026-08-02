const { execSync } = require('child_process');

function run(label, url, body) {
  try {
    const out = execSync(`curl -s -i -X POST -H "Content-Type: application/json" -d '${body}' "${url}"`, { encoding: 'utf8', shell: 'cmd.exe' });
    console.log(`=== ${label} ===`);
    console.log(out.split('\r\n').slice(0, 8).join('\n'));
    console.log('BODY:', out.split('\r\n\r\n')[1]);
  } catch (e) {
    console.log(`=== ${label} ERROR: ${e.message}`);
  }
}

setTimeout(() => {
  run('LOCAL fonts/google', 'http://localhost:3001/api/fonts/google', '{"name":"Roboto"}');
  run('LOCAL generate', 'http://localhost:3001/api/generate', '{}');
  process.exit(0);
}, 2500);
