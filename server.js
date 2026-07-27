// Custom Next.js server for Plesk + Phusion Passenger (IONOS).
// Passenger sets PORT; locally it falls back to 3000.
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  }).listen(port, () => {
    console.log(`> The Paddocks Hotel ready on port ${port}`);
  });
});
