const fs = require('fs');
let code = fs.readFileSync('src/components/BookReaderModal.tsx', 'utf8');

// 1. Remove Desktop Page Navigation
code = code.replace(/\{\/\* Desktop Only Page Navigation Controls \*\/\}\s*\{!isMobile && \([\s\S]*?<\/div>\s*\)\}/, '');

// 2. Remove Zoom Controls from Header
code = code.replace(/\{\/\* Zoom Controls \(Active in PDF mode\) - Desktop Only \*\/\}\s*\{pdfDoc && !isMobile && \([\s\S]*?<\/div>\s*\)\}/, '');

// 3. Remove Quick Scroll Header Shortcuts
code = code.replace(/\{\/\* Quick Scroll Header Shortcuts \*\/\}\s*<div className="hidden lg:flex items-center bg-white px-1 py-1 rounded-xl border border-slate-200 text-xs gap-0\.5">[\s\S]*?<\/div>/, '');

// 4. Make Chapters button visible on mobile
code = code.replace(/\{!isMobile && \(\s*(<button\s*onClick=\{\(\) => setShowChaptersSidebar\(!showChaptersSidebar\)\}[\s\S]*?<\/button>)\s*\)\}/, '$1');

// 5. Remove Bottom of Page Completion Card
code = code.replace(/\{\/\* Bottom of Page Completion Card with Easy Scroll-To-Top & Next Page \*\/\}\s*<div className="mt-8 p-4 bg-white\/95 border border-blue-200 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 max-w-xl w-full text-xs">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, '</div>\n</div>');

// 6. Remove Right-Side Vertical Controller
code = code.replace(/\{\/\* DEDICATED HIGH-VISIBILITY UP & DOWN CONTROLLER \(Right-Side Vertical Controller\) \*\/\}\s*<div className="absolute right-2 sm:right-6 top-1\/2 -translate-y-1\/2 z-40 flex flex-col items-center gap-1\.5 bg-slate-900\/95 backdrop-blur-md p-2 rounded-2xl border border-slate-700\/80 shadow-2xl ring-1 ring-white\/10 select-none">[\s\S]*?<\/button>\s*<\/div>\s*<\/div>/, '</div>');

// 7. Remove Mobile Bottom Toolbar and add the universal pill before the closing tags
const mobileToolbarRegex = /\{\/\* Mobile Bottom Toolbar \*\/\}\s*\{isMobile && \(\s*<div className="px-4 py-2\.5 bg-\[#e2ecf8\]\/95 backdrop-blur-md border-t border-blue-200 flex items-center justify-between shrink-0 z-30 shadow-lg">[\s\S]*?<\/div>\s*\)\}/;

const universalPill = `
        {/* UNIVERSAL FLOATING PAGINATION PILL */}
        <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 sm:gap-3 bg-slate-900/90 backdrop-blur-md px-3 sm:px-5 py-2 sm:py-3 rounded-full border border-slate-700/50 shadow-[0_10px_40px_rgba(0,0,0,0.3)] text-white">
          <button onClick={handlePrevPage} disabled={currentPage <= 1 || isLoading} className="p-1 sm:p-2 hover:bg-slate-700 active:bg-slate-600 rounded-full disabled:opacity-30 transition-colors">
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          
          <div className="flex items-center gap-2 px-1 sm:px-2">
            <input 
              type="number"
              value={pageInputVal}
              onChange={handlePageInputChange}
              onKeyDown={handlePageInputKeyDown}
              onBlur={() => setPageInputVal(currentPage.toString())}
              disabled={isLoading}
              className="w-12 sm:w-14 text-center bg-slate-800 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 text-sm sm:text-base py-1 font-bold font-mono transition-colors"
            />
            <span className="text-slate-400 text-sm sm:text-base font-bold font-mono">/ {totalDisplayPages}</span>
          </div>

          <button onClick={handleNextPage} disabled={currentPage >= totalDisplayPages || isLoading} className="p-1 sm:p-2 hover:bg-slate-700 active:bg-slate-600 rounded-full disabled:opacity-30 transition-colors">
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          
          {pdfDoc && (
            <>
              <div className="w-[2px] h-6 bg-slate-700 mx-1 sm:mx-2 rounded-full" />
              <button onClick={handleZoomOut} className="p-1 sm:p-2 hover:bg-slate-700 active:bg-slate-600 rounded-full text-slate-300 transition-colors" title="Perkecil (-)">
                <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <span className="text-xs sm:text-sm font-bold font-mono text-slate-300 w-10 sm:w-12 text-center">{Math.round(scale * 100)}%</span>
              <button onClick={handleZoomIn} className="p-1 sm:p-2 hover:bg-slate-700 active:bg-slate-600 rounded-full text-slate-300 transition-colors" title="Perbesar (+)">
                <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </>
          )}
        </div>
`;

code = code.replace(mobileToolbarRegex, universalPill);

fs.writeFileSync('src/components/BookReaderModal.tsx', code);
console.log("Replacement successful.");
