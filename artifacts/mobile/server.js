const http = require("http");

const port = parseInt(process.env.PORT || "18115", 10);

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", type: "mobile-app" }));
});

server.listen(port, "0.0.0.0", () => {
  console.log(`[mobile] Stub server listening on port ${port}`);
});
