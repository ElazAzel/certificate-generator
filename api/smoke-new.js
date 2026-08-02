const { default: handler } = require('./.smoke/index.js');
const http = require('http');
const fs = require('fs');

http.createServer((req, res) => handler(req, res).catch(e => { res.statusCode = 500; res.end(String(e)); }))
  .listen(3001, async () => {
    const base = 'http://localhost:3001';
    const j = (r) => r.json();

    // 1. Seeded templates list
    let r = await fetch(base + '/api/upload/templates');
    const list = await j(r);
    console.log('templates list:', r.status, JSON.stringify(list.map(t => ({ id: t.id, previewUrl: t.previewUrl }))).slice(0, 200));

    // 2. Sample template download by seeded id
    r = await fetch(base + '/api/upload/template/sample_certificate_landscape.pdf');
    const pdfBytes = Buffer.from(await r.arrayBuffer());
    console.log('sample download:', r.status, pdfBytes.length, 'bytes');
    fs.writeFileSync('sample2.pdf', pdfBytes);

    // 3. Generate WITHOUT prior upload — using templateData base64 (fresh instance simulation)
    const templateData = pdfBytes.toString('base64');
    r = await fetch(base + '/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        excelData: [{ name: 'Тест Тестов', certificate_number: '777' }],
        templateId: 'fresh_inst_' + Date.now(),
        templateData,
        templateType: 'pdf',
        templateWidth: 1122,
        templateHeight: 794,
        fields: [
          { id: 'f1', label: 'ФИО', excelColumn: 'name', x: 60, y: 60, width: 500, height: 50, fontFamily: 'Helvetica', fontSize: 28, fontColor: '#000000', align: 'center', verticalAlign: 'middle', bold: true, italic: false, rotation: 0, letterSpacing: 1, lineHeight: 1.2, mode: 'single-line', visible: true },
          { id: 'f3', label: 'QR', excelColumn: 'certificate_number', x: 900, y: 100, width: 150, height: 150, fontFamily: 'Helvetica', fontSize: 10, fontColor: '#000000', align: 'center', verticalAlign: 'middle', bold: false, italic: false, rotation: 0, letterSpacing: 0, lineHeight: 1.2, mode: 'single-line', visible: true, contentType: 'qr', qrValueTemplate: 'https://v/{certificate_number}' },
        ],
        exportConfig: { mode: 'separate', fileNameTemplate: '{name}', fileNameColumn: 'name', outputFolder: 'output', combinedFileName: 'all.pdf' },
      }),
    });
    const gen = await j(r);
    console.log('generate(fresh):', r.status, 'ok=' + gen.successCount, 'zipBase64 len=' + (gen.zipBase64 ? gen.zipBase64.length : 0), 'zipSize=' + gen.zipSize);

    // 4. generate/test with templateData
    r = await fetch(base + '/api/generate/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        row: { name: 'Тест', certificate_number: '1' },
        templateId: 'fresh_test_' + Date.now(),
        templateData,
        templateType: 'pdf',
        templateWidth: 1122,
        templateHeight: 794,
        fields: [{ id: 'f1', label: 'ФИО', excelColumn: 'name', x: 60, y: 60, width: 400, height: 50, fontFamily: 'Helvetica', fontSize: 28, fontColor: '#000000', align: 'left', verticalAlign: 'top', bold: false, italic: false, rotation: 0, letterSpacing: 0, lineHeight: 1.2, mode: 'single-line', visible: true }],
      }),
    });
    console.log('generate/test(fresh):', r.status, 'bytes=' + (await r.arrayBuffer()).byteLength);

    process.exit(0);
  });
