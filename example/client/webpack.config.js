const webpack = require("webpack");

module.exports = {
  entry: "./index.js",
  output: {
    path: __dirname,
    filename: "build/bundle.js"
  },
  plugins: [
    new webpack.DefinePlugin({
      WEBPACK: JSON.stringify(true)
    })
  ]
};
