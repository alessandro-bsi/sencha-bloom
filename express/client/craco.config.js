// craco.config.js
const path = require("path");
const webpack = require("webpack");

module.exports = {
    webpack: {
        configure: (webpackConfig) => {
            // Ensure fallbacks for Webpack 5 compatibility with Node.js modules
            webpackConfig.resolve.fallback = {
                crypto: require.resolve("crypto-browserify"),
                stream: require.resolve("stream-browserify"),
                assert: require.resolve("assert/"),
                http: require.resolve("stream-http"),
                https: require.resolve("https-browserify"),
                os: require.resolve("os-browserify/browser"),
                url: require.resolve("url/"),
                process: require.resolve("process/browser"),
                buffer: require.resolve("buffer"),
                vm: false // Add this line to use an empty module for `vm`
            };

            // Add plugins to provide necessary polyfills
            webpackConfig.plugins.push(
                new webpack.ProvidePlugin({
                    process: "process/browser",
                    Buffer: ["buffer", "Buffer"],
                })
            );

            // Forcefully resolve fully-specified ESM imports like `process/browser`
            webpackConfig.module.rules.push({
                test: /\.m?js$/,
                resolve: {
                    fullySpecified: false,
                },
            });

            const scopePluginIndex = webpackConfig.resolve.plugins.findIndex(
                ({ constructor }) => constructor && constructor.name === 'ModuleScopePlugin'
            );

            if (scopePluginIndex !== -1) {
                webpackConfig.resolve.plugins.splice(scopePluginIndex, 1);
            }

            // Enable experiments such as top-level await
            webpackConfig.experiments = { topLevelAwait: true };
            return webpackConfig;

        },

        alias: {
            '@': path.resolve(__dirname, 'src/'),
            crypto: require.resolve("crypto-browserify"),
        },
    },
};
