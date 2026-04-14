const pdf = require('pdf-parse');
console.log('Keys:', Object.keys(pdf));
if (pdf.default) {
    console.log('default type:', typeof pdf.default);
}
if (typeof pdf === 'function') {
    console.log('Is function');
} else if (pdf.default && typeof pdf.default === 'function') {
    console.log('Use .default');
}
