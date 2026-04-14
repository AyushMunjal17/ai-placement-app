const pdf = require('pdf-parse/node');
console.log('Type of pdf-parse/node:', typeof pdf);
if (typeof pdf === 'function') {
    console.log('SUCCESS: pdf-parse/node is a function');
} else if (pdf.default && typeof pdf.default === 'function') {
    console.log('SUCCESS: pdf-parse/node.default is a function');
}
