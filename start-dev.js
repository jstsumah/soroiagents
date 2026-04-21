#!/usr/bin/env node

// Start Next.js development server

// Set process arguments as if we're running: next dev -p 3000
process.argv = ['node', 'next', 'dev', '-p', '3000'];

// Require the Next.js bin file which will execute based on process.argv
require('./node_modules/next/dist/bin/next');


