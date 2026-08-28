const fs = require('fs');
let code = fs.readFileSync('src/components/BookReaderModal.tsx', 'utf8');
console.log(code.match(/Bottom of Page/g));
