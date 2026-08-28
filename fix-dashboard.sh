#!/bin/bash
awk '
/const res = await fetch\('\''\/api\/upload-pdf'\''/ {
  print "        // Upload asynchronously";
  print "        fetch('\''/api/upload-pdf'\'', {";
  print "          method: '\''POST'\'',";
  print "          headers: { '\''Content-Type'\'': '\''application/json'\'' },";
  print "          body: JSON.stringify({ fileBase64: b64, fileName: matPdfFile ? matPdfFile.name : bookPdfFile?.name, id: newId || bookId })";
  print "        }).catch(err => console.warn('\''Server upload optional'\'', err));";
  skip=1
  next
}
skip && /if \(res.ok\) \{/ { next }
skip && /const data = await res.json\(\);/ { next }
skip && /fileUrlFromServer = data.fileUrl;/ { next }
skip && /^\s*\}\s*$/ {
  if (skip_brace_count == 0) {
    skip = 0
    next
  }
}
skip && /body: JSON.stringify/ { next }
skip && /fileName: / { next }
skip && /id: / { next }
skip && /fileBase64: / { next }
skip && /headers: / { next }
skip && /method: / { next }
skip && /'\''Content-Type'\'': / { next }
skip && /\}\)/ { next }
skip { next }
1' src/components/GuruDashboard.tsx > temp.tsx && mv temp.tsx src/components/GuruDashboard.tsx
