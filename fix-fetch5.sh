#!/bin/bash
awk '
/\/\/ Upload asynchronously/ {
  if (!inserted) {
    print "        fetch('\''/api/upload-pdf'\'', {";
    print "          method: '\''POST'\'',";
    print "          headers: { '\''Content-Type'\'': '\''application/json'\'' },";
    print "          body: JSON.stringify({ fileBase64: b64, fileName: \"document.pdf\", id: \"fallback-id\" })";
    print "        }).catch(err => {});";
    inserted = 1
  }
  next
}
1' src/components/GuruDashboard.tsx > temp.tsx && mv temp.tsx src/components/GuruDashboard.tsx
