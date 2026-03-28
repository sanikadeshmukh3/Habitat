c#!/bin/bash

echo "Installing backend dependencies..."
cd backend && npm install

echo "Starting backend server..."
npm run dev &

echo "Installing mobile dependencies..."
cd ../mobile && npm install

echo "Starting mobile app..."
npx expo start