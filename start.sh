#!/bin/sh

echo "Starting background worker..."
node dist/lib/queue/workers/index.js &

echo "Starting Next.js web application..."
exec node server.js
