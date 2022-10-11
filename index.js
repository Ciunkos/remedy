import express from "express";
import { readFile } from "fs/promises";
import bodyParser from "body-parser";

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let indexFilePromise = undefined;
app.get("/", async (_, res, next) => {
  try {
    const contents = await (indexFilePromise ??
      (indexFilePromise = readFile("./index.html", "utf-8")));

    res.contentType("text/html;charset=UTF-8").send(contents);
    next();
  } catch (error) {
    next(error);
  }
});

app.get("/echo", (req, res) => {
  res.send({
    body: req.body,
    cookies: req.cookies,
    headers: req.headers,
    httpVersion: req.httpVersion,
    ip: req.ip,
    ips: req.ips,
    method: req.method,
    originalUrl: req.originalUrl,
    params: req.params,
    path: req.path,
    query: req.query,
    url: req.url,
    xyz: req.hostname,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});
