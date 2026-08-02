const { default: handler } = require('./.smoke/index.js');
const http = require('http');
http.createServer((req, res) => handler(req, res).catch(e => { res.statusCode = 500; res.end(String(e)); }))
  .listen(3001, () => console.log('UP'));
