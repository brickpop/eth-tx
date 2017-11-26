#!/bin/bash

# Attempt to compile
if [ ! -f ../build/contracts.js ]; then
    node ../nodejs/index.js
fi

# Package the JS bundle
../../node_modules/.bin/webpack --config webpack.config.js
