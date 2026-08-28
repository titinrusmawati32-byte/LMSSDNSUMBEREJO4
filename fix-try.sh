#!/bin/bash
sed -i 's/        }).catch(err => {});\n    };\n    setIsUploading(false);/        }).catch(err => {});\n      } catch (err) {}\n    }\n    setIsUploading(false);/g' src/components/GuruDashboard.tsx
