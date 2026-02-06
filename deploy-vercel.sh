#!/bin/bash

# This script deploys the application to Vercel

# Define your Vercel token and project
VERCEL_TOKEN="1WlvPuSS4bCVl5IxjKM20aSQ"
VERCEL_PROJECT="your-vercel-project-id"

# Trigger deployment
curl -X POST "https://api.vercel.com/v1/deployments" \  
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \  
  -H "Content-Type: application/json" \  
  -d '{"name":"${VERCEL_PROJECT}","gitSource":{"type":"github","repoId":"1136915001"}}'

echo "Deployment triggered successfully!"