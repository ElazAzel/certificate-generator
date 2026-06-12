const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Ensure sample-data directory exists
const sampleDir = path.join(__dirname, 'sample-data');
if (!fs.existsSync(sampleDir)) {
  fs.mkdirSync(sampleDir, { recursive: true });
}

// 1. Generate sample.xlsx
const data = [
  {
    name: 'Иван Иванов',
    certificate_number: 'CERT-2026-001',
    date: '12 июня 2026 г.',
    course: 'Основы программирования на Node.js',
    hours: '40 часов',
    instructor: 'А. С. Петров'
  },
  {
    name: 'Мария Смирнова',
    certificate_number: 'CERT-2026-002',
    date: '12 июня 2026 г.',
    course: 'Продвинутый React и TypeScript',
    hours: '56 часов',
    instructor: 'И. И. Сидоров'
  },
  {
    name: 'John Doe',
    certificate_number: 'CERT-2026-003',
    date: '15 июня 2026 г.',
    course: 'Fullstack Web Development',
    hours: '120 часов',
    instructor: 'Michael Brown'
  }
];

const worksheet = XLSX.utils.json_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Participants');

const excelPath = path.join(sampleDir, 'sample.xlsx');
XLSX.writeFile(workbook, excelPath);
console.log('Sample Excel file successfully created at:', excelPath);

// 2. Generate sample-config.json
const config = {
  version: '1.0.0',
  template: {
    width: 842,
    height: 595,
    unit: 'pdf-points'
  },
  fields: [
    {
      id: 'field_name',
      label: 'ФИО Получателя',
      excelColumn: 'name',
      x: 121,
      y: 240,
      width: 600,
      height: 45,
      fontFamily: 'Helvetica',
      fontSize: 28,
      fontColor: '#1e1b4b',
      align: 'center',
      verticalAlign: 'middle',
      bold: true,
      italic: false,
      rotation: 0,
      letterSpacing: 0,
      lineHeight: 1.2,
      mode: 'shrink-to-fit',
      visible: true
    },
    {
      id: 'field_course',
      label: 'Название курса',
      excelColumn: 'course',
      x: 121,
      y: 330,
      width: 600,
      height: 40,
      fontFamily: 'Helvetica',
      fontSize: 18,
      fontColor: '#4f46e5',
      align: 'center',
      verticalAlign: 'middle',
      bold: false,
      italic: true,
      rotation: 0,
      letterSpacing: 0,
      lineHeight: 1.2,
      mode: 'multiline',
      visible: true
    },
    {
      id: 'field_cert_num',
      label: 'Номер сертификата',
      excelColumn: 'certificate_number',
      x: 121,
      y: 490,
      width: 250,
      height: 30,
      fontFamily: 'Courier',
      fontSize: 12,
      fontColor: '#64748b',
      align: 'left',
      verticalAlign: 'middle',
      bold: false,
      italic: false,
      rotation: 0,
      letterSpacing: 0,
      lineHeight: 1.2,
      mode: 'single-line',
      visible: true
    },
    {
      id: 'field_date',
      label: 'Дата выдачи',
      excelColumn: 'date',
      x: 471,
      y: 490,
      width: 250,
      height: 30,
      fontFamily: 'Helvetica',
      fontSize: 12,
      fontColor: '#64748b',
      align: 'right',
      verticalAlign: 'middle',
      bold: false,
      italic: false,
      rotation: 0,
      letterSpacing: 0,
      lineHeight: 1.2,
      mode: 'single-line',
      visible: true
    }
  ],
  export: {
    mode: 'separate',
    fileNameTemplate: '{name}_{certificate_number}.pdf',
    fileNameColumn: 'name',
    outputFolder: 'output',
    combinedFileName: 'certificates_all.pdf'
  }
};

const configPath = path.join(sampleDir, 'sample-config.json');
fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
console.log('Sample JSON configuration successfully created at:', configPath);
