#!/bin/bash
awk '
/const handleAddBookSubmit = async \(e: React.FormEvent\) => \{/ {
  print;
  print "    setIsUploading(true);";
  next
}
/onAddBook\(newBk\);/ {
  print "    setIsUploading(false);";
  print;
  next
}
1' src/components/GuruDashboard.tsx > temp.tsx && mv temp.tsx src/components/GuruDashboard.tsx
