#!/bin/bash
awk '
/Simpan Buku PDF Ke Perpustakaan/ {
  print "                  {isUploading ? \"Sedang Menyimpan...\" : \"Simpan Buku PDF Ke Perpustakaan\"}";
  next
}
/className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600/ {
  print "                  disabled={isUploading}";
  print "                  className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-all ${isUploading ? \"bg-indigo-500 opacity-70 cursor-wait\" : \"bg-indigo-600 hover:bg-indigo-500\"}`}";
  next
}
1' src/components/GuruDashboard.tsx > temp.tsx && mv temp.tsx src/components/GuruDashboard.tsx
