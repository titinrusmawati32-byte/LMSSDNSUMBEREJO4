const fs = require('fs');
let code = fs.readFileSync('src/components/BookReaderModal.tsx', 'utf8');

// Fix extra closing divs or missing ones that broke JSX.
// We can just rely on Prettier or TS to find the exact spot, but let's carefully clean it up.
code = code.replace(/<\/div>\s*<\/div>\s*\)\s*:\s*\(/g, '</div>\n            ) : (');
code = code.replace(/<\/div>\s*<\/div>\s*\{\/\* UNIVERSAL FLOATING PAGINATION PILL \*\/\}/, '</div>\n        {/* UNIVERSAL FLOATING PAGINATION PILL */}');

fs.writeFileSync('src/components/BookReaderModal.tsx', code);
