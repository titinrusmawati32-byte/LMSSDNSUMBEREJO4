#!/bin/bash
sed -i 's/const res = await fetch(\/api\/upload-pdf/fetch(\/api\/upload-pdf/g' src/components/GuruDashboard.tsx
sed -i 's/        if (res.ok) {/        \/\/ if (res.ok) {/g' src/components/GuruDashboard.tsx
sed -i 's/          const data = await res.json();/          \/\/ const data = await res.json();/g' src/components/GuruDashboard.tsx
sed -i 's/          fileUrlFromServer = data.fileUrl;/          \/\/ fileUrlFromServer = data.fileUrl;/g' src/components/GuruDashboard.tsx
sed -i 's/        }/        \/\/ }/g' src/components/GuruDashboard.tsx
