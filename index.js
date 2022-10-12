import express from "express";
import { readFile } from "fs/promises";
import bodyParser from "body-parser";
import { WebSocket, WebSocketServer } from "ws";

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
    hostname: req.hostname,
    httpVersion: req.httpVersion,
    ip: req.ip,
    ips: req.ips,
    method: req.method,
    originalUrl: req.originalUrl,
    params: req.params,
    path: req.path,
    query: req.query,
    url: req.url,
  });
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});

const wsServer = new WebSocketServer({ noServer: true });

const messages = [];

wsServer.on("connection", (socket) => {
  console.log("connection");

  socket.on("message", (data, isBinary) => {
    console.log("message", { isBinary });

    messages.push([data, isBinary]);

    wsServer.clients.forEach((client) => {
      console.log("broadcast");

      if (client.readyState === WebSocket.OPEN) {
        client.send(data, { binary: isBinary });
      }
    });
  });
});

server.on("upgrade", (request, socket, head) => {
  console.log("upgrade");

  wsServer.handleUpgrade(request, socket, head, (socket) => {
    console.log("connection");
    wsServer.emit("connection", socket, request);

    console.log("restore", { messages: messages.length });
    for (const [data, isBinary] of messages) {
      socket.send(data, { binary: isBinary });
    }
  });
});
