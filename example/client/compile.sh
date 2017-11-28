#!/bin/bash

# Attempt to compile
if [ ! -f ../build/contracts.js ]; then
    cd ../nodejs
    node index.js
    cd -
fi

# Package the JS bundle
npx webpack -p --config webpack.config.js
