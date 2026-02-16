// Lightweight gateway so the app is reachable on a standard port (e.g. 80),
// while still keeping the frontend on :5000 and backend on :5010.
//
// Routes:
// - /api/*  -> backend
// - everything else -> frontend
//
// Uses http-proxy which is already installed under backend/node_modules.

const http = require("http");
const url = require("url");

// Require from the backend's node_modules to avoid a separate install.
// eslint-disable-next-line import/no-dynamic-require, global-require
const httpProxy = require(__dirname + "/backend/node_modules/http-proxy");

const PORT = Number(process.env.PORT || 80);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://127.0.0.1:5000";
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:5010";

const proxy = httpProxy.createProxyServer({
  xfwd: true,
  ws: true,
});

proxy.on("error", (err, req, res) => {
  // Avoid crashing the process on transient upstream failures.
  if (res && !res.headersSent) {
    res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
  }
  res.end(`Bad gateway: ${err.message}`);
});

const server = http.createServer((req, res) => {
  const pathname = url.parse(req.url).pathname || "";
  const target = pathname.startsWith("/api") ? BACKEND_URL : FRONTEND_URL;
  proxy.web(req, res, { target });
});

server.on("upgrade", (req, socket, head) => {
  const pathname = url.parse(req.url).pathname || "";
  const target = pathname.startsWith("/api") ? BACKEND_URL : FRONTEND_URL;
  proxy.ws(req, socket, head, { target });
});

server.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(
    `Gateway listening on :${PORT} (frontend -> ${FRONTEND_URL}, backend -> ${BACKEND_URL})`
  );
});
