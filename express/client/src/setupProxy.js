// client/src/setupProxy.js
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
    app.use(
        ["/api", "/ws"], // Proxy requests starting with /api and /ws
        createProxyMiddleware({
            target: "http://0.0.0.0:5000", // URL of your Express server
            changeOrigin: true,
            ws: true, // Enable WebSocket proxying
        })
    );
};
