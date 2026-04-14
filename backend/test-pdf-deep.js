let pdf;
try {
    pdf = require('pdf-parse');
    console.log('Main export type:', typeof pdf);
    console.log('Main export keys:', Object.keys(pdf));

    if (typeof pdf === 'function') {
        console.log('SUCCESS: pdf-parse is a function');
    } else {
        // Try to find the function
        for (const key in pdf) {
            if (typeof pdf[key] === 'function') {
                console.log(`Found function at key: ${key}`);
            }
        }
    }
} catch (e) {
    console.log('Error requiring pdf-parse:', e.message);
}
