// Lightweight gateway so the app is reachable on a standard port (e.g. 80),
// while still keeping the frontend on :5000 and backend on :5010.
//
// Routes:
// - /api/*  -> backend
// - /webssh/* -> web terminal
// - /httpterm/* -> HTTP-only terminal
// - everything else -> frontend
//
// Uses http-proxy which is already installed under backend/node_modules.

const http = require("http");
const https = require("https");
const url = require("url");
const path = require("path");
const fs = require("fs");

// Require from the backend's node_modules to avoid a separate install.
// eslint-disable-next-line import/no-dynamic-require, global-require
const httpProxy = require(__dirname + "/backend/node_modules/http-proxy");

const PORT = Number(process.env.PORT || 80);
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 443);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://127.0.0.1:5000";
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:5010";
const WEBSSH_URL = process.env.WEBSSH_URL || "http://127.0.0.1:9090";
const HTTPTERM_URL = process.env.HTTPTERM_URL || "http://127.0.0.1:9091";
const TLS_CERT_PATH =
  process.env.TLS_CERT_PATH || "/etc/letsencrypt/live/openfolio.uk/fullchain.pem";
const TLS_KEY_PATH =
  process.env.TLS_KEY_PATH || "/etc/letsencrypt/live/openfolio.uk/privkey.pem";

const hasFileExtension = (pathname) => path.posix.extname(pathname) !== "";
const acceptsHtml = (req) => {
  const accept = String(req.headers.accept || "");
  return accept === "" || accept.includes("text/html") || accept.includes("*/*");
};

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

const handleRequest = (req, res) => {
  const pathname = url.parse(req.url).pathname || "";
  const isFrontendNavigation =
    (req.method === "GET" || req.method === "HEAD") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/webssh") &&
    !pathname.startsWith("/httpterm") &&
    !hasFileExtension(pathname) &&
    acceptsHtml(req);

  if (isFrontendNavigation && pathname !== "/") {
    req.url = "/";
  }

  const target = pathname.startsWith("/webssh")
    ? WEBSSH_URL
    : pathname.startsWith("/httpterm")
      ? HTTPTERM_URL
    : pathname.startsWith("/api")
      ? BACKEND_URL
      : FRONTEND_URL;
  proxy.web(req, res, { target });
};

const handleUpgrade = (req, socket, head) => {
  const pathname = url.parse(req.url).pathname || "";
  const target = pathname.startsWith("/webssh")
    ? WEBSSH_URL
    : pathname.startsWith("/httpterm")
      ? HTTPTERM_URL
    : pathname.startsWith("/api")
      ? BACKEND_URL
      : FRONTEND_URL;
  proxy.ws(req, socket, head, { target });
};

const server = http.createServer(handleRequest);
server.on("upgrade", handleUpgrade);

server.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(
    `Gateway listening on :${PORT} (frontend -> ${FRONTEND_URL}, backend -> ${BACKEND_URL}, webssh -> ${WEBSSH_URL}, httpterm -> ${HTTPTERM_URL})`
  );
});

if (fs.existsSync(TLS_CERT_PATH) && fs.existsSync(TLS_KEY_PATH)) {
  const httpsServer = https.createServer(
    {
      cert: fs.readFileSync(TLS_CERT_PATH),
      key: fs.readFileSync(TLS_KEY_PATH),
    },
    handleRequest
  );

  httpsServer.on("upgrade", handleUpgrade);
  httpsServer.listen(HTTPS_PORT, "0.0.0.0", () => {
    // eslint-disable-next-line no-console
    console.log(`HTTPS gateway listening on :${HTTPS_PORT} using ${TLS_CERT_PATH}`);
  });
} else {
  // eslint-disable-next-line no-console
  console.warn(
    `TLS certificate not found (${TLS_CERT_PATH}, ${TLS_KEY_PATH}); HTTPS listener disabled`
  );
}
