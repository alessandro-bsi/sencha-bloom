#!/usr/bin/env bash

bash -c "cd client && ./setup.sh"
bash -c "npm install"

npm run build --prefix client
npm start
