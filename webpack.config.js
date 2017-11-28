// Webpack config to bundle the browser version

module.exports = {
  entry: "./index-browser.js",
  output: {
    path: __dirname,
    filename: "index-browser.min.js"
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
            compact: true
          }
        }
      }
    ]
  }
};
