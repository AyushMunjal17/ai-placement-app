const pdf = require('pdf-parse');
console.log('Keys in pdf-parse:', Object.keys(pdf));
console.log('Is default a function?', typeof pdf.default === 'function');
