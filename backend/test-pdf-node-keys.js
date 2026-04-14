const pdf = require('pdf-parse/node');
console.log('Keys of pdf-parse/node:', Object.keys(pdf));
if (pdf.pdfParse) console.log('Found pdfParse function');
if (pdf.default) console.log('Found default');
