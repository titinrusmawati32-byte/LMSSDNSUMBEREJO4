const fs = require('fs');
let code = fs.readFileSync('src/components/BookReaderModal.tsx', 'utf8');

code = code.replace(/<\/div>\s*<\/div>\s*\)\s*:\s*\(/g, '</div>\n            ) : (');
code = code.replace(/<\/div>\s*<\/div>\s*\{\/\* UNIVERSAL FLOATING PAGINATION PILL \*\/\}/, '</div>\n        {/* UNIVERSAL FLOATING PAGINATION PILL */}');

fs.writeFileSync('src/components/BookReaderModal.tsx', code);
