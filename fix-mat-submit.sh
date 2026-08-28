#!/bin/bash
awk '
/const handleAddMaterialSubmit = async \(e: React.FormEvent\) => \{/ {
  print;
  print "    setIsUploading(true);";
  next
}
/if \(!matTitle.trim\(\)\) return;/ {
  print "    if (!matTitle.trim()) { setIsUploading(false); return; }";
  next
}
/onAddMaterial\(newMat\);/ {
  print "    setIsUploading(false);";
  print;
  next
}
/Simpan Bahan Ajar/ {
  print "                  {isUploading ? \"Sedang Menyimpan...\" : \"Simpan Bahan Ajar\"}";
  next
}
/className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600/ {
  print "                  disabled={isUploading}";
  print "                  className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-all ${isUploading ? \"bg-blue-500 opacity-70 cursor-wait\" : \"bg-blue-600 hover:bg-blue-500\"}`}";
  next
}
1' src/components/GuruDashboard.tsx > temp.tsx && mv temp.tsx src/components/GuruDashboard.tsx
