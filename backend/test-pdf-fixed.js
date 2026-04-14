const pdf = require('pdf-parse');
console.log('Type of pdf-parse 1.1.1:', typeof pdf);
if (typeof pdf === 'function') {
    console.log('SUCCESS: pdf-parse is a function now!');
}
