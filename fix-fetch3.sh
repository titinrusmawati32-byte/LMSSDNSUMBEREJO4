#!/bin/bash
# I will just use sed to replace the await fetch block
sed -i 's/const res = await fetch('\''\/api\/upload-pdf'\'', {/fetch('\''\/api\/upload-pdf'\'', {/g' src/components/GuruDashboard.tsx
