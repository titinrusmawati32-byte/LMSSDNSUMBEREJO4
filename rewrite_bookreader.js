const fs = require('fs');
let code = fs.readFileSync('src/components/BookReaderModal.tsx', 'utf8');

// 1. Remove Desktop Page Navigation (lines ~710-759)
code = code.replace(/\{\/\* Desktop Only Page Navigation Controls \*\/\}\s*\{!isMobile && \([\s\S]*?\)\}/, '');

// 2. Remove Zoom Controls from Header (lines ~781-822)
code = code.replace(/\{\/\* Zoom Controls \(Active in PDF mode\) - Desktop Only \*\/\}\s*\{pdfDoc && !isMobile && \([\s\S]*?\)\}/, '');

// 3. Remove Quick Scroll Header Shortcuts (lines ~761-779)
code = code.replace(/\{\/\* Quick Scroll Header Shortcuts \*\/\}\s*<div className="hidden lg:flex items-center bg-white[\s\S]*?<\/div>/, '');

// 4. Make Chapters button visible on mobile (lines ~854-855)
// Find `{!isMobile && (` before the chapters button and its closing `)}`
code = code.replace(/\{!isMobile && \(\s*(<button\s*onClick=\{\(\) => setShowChaptersSidebar\(!showChaptersSidebar\)\}[\s\S]*?<\/button>)\s*\)\}/, '$1');

// 5. Remove Bottom of Page Completion Card
code = code.replace(/\{\/\* Bottom of Page Completion Card with Easy Scroll-To-Top & Next Page \*\/\}\s*<div className="mt-8 p-4 bg-white\/95 border border-blue-200[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, '</div>\n</div>');

// 6. Remove DEDICATED HIGH-VISIBILITY UP & DOWN CONTROLLER
code = code.replace(/\{\/\* DEDICATED HIGH-VISIBILITY UP & DOWN CONTROLLER \(Right-Side Vertical Controller\) \*\/\}\s*<div className="absolute right-2 sm:right-6 top-1\/2 -translate-y-1\/2[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\{!isMobile &&/, '</div>\n</div>\n{!isMobile &&'); // Wait, the closing tags might be tricky.

fs.writeFileSync('src/components/BookReaderModal.tsx', code);
console.log("Replaced desktop controls & quick scroll.");
