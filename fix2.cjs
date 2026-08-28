const fs = require('fs');
let code = fs.readFileSync('src/components/BookReaderModal.tsx', 'utf8');

// The line currently reads:
//                       </div>
//             ) : (
//                     <div className="space-y-4 text-slate-800 text-xs sm:text-sm leading-relaxed">
// Let's replace it with:
//                       </div>
//                     </div>
//             ) : (
code = code.replace(/<\/div>\n\s*\)\s*:\s*\(\n\s*<div className="space-y-4 text-slate-800/, '</div>\n                    </div>\n            ) : (\n                    <div className="space-y-4 text-slate-800');

fs.writeFileSync('src/components/BookReaderModal.tsx', code);
