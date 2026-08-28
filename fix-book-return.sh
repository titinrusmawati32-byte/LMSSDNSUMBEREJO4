#!/bin/bash
awk '
/if \(!bookTitle.trim\(\)\) return;/ {
  print "    if (!bookTitle.trim()) { setIsUploading(false); return; }";
  next
}
1' src/components/GuruDashboard.tsx > temp.tsx && mv temp.tsx src/components/GuruDashboard.tsx
