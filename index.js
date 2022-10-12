import express from "express";
import http from "http";
import { readFile } from "fs/promises";
import bodyParser from "body-parser";
import { WebSocket, WebSocketServer } from "ws";
import expressOpenidConnect from "express-openid-connect";

const { auth, requiresAuth } = expressOpenidConnect;

const config = {
  auth0Logout: true,
  authRequired: false,
  baseURL: process.env.BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  enableTelemetry: false,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  secret: process.env.AUTH0_CLIENT_SECRET,
};

const app = express();

const authMiddleware = auth(config);

app.use(authMiddleware);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let indexFilePromise = undefined;

app.get("/", requiresAuth(), async (_, res, next) => {
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

  const user = socket.user;

  socket.on("message", (data, isBinary) => {
    const json = data.toString("utf8");

    const authenticatedMessage = { ...JSON.parse(json), from: user.email };
    const authenticatedMessageJson = JSON.stringify(authenticatedMessage);

    messages.push([authenticatedMessageJson, isBinary]);

    wsServer.clients.forEach((client) => {
      console.log("broadcast");

      if (client.readyState === WebSocket.OPEN) {
        client.send(authenticatedMessageJson, { binary: isBinary });
      }
    });
  });
});

app.get("/profile", requiresAuth(), (req, res) => {
  res.send(req.oidc.user);
});

server.on("upgrade", (req, socket, head) => {
  console.log("upgrade");

  const res = new http.ServerResponse(req);

  res.on("finish", () => {
    res.socket.destroy();
  });

  app.handle(req, res, () => {
    const isAuthenticated = req.oidc.isAuthenticated();

    if (isAuthenticated) {
      try {
        wsServer.handleUpgrade(req, socket, head, (socket) => {
          console.log("connection");

          socket.user = req.oidc.user;

          wsServer.emit("connection", socket, req);

          console.log("auth");
          socket.send(
            JSON.stringify({
              id: req.oidc.user.email,
              timestamp: Date.now(),
              type: "auth",
            }),
            { binary: false }
          );

          console.log("restore", { messages: messages.length });
          for (const [data, isBinary] of messages) {
            socket.send(data, { binary: isBinary });
          }
        });
      } catch (error) {
        console.log(error);
      }
    } else {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
  });
});
