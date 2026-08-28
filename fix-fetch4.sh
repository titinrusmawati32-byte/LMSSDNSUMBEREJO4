#!/bin/bash
awk '
/fetch\('\''\/api\/upload-pdf/ {
  skip=1
}
/catch\(err => console.warn/ {
  skip=0; next
}
skip { next }
1' src/components/GuruDashboard.tsx > temp.tsx && mv temp.tsx src/components/GuruDashboard.tsx
