import { randomUUID } from "node:crypto";
import http from "node:http";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import pino from "pino";
import pinoPretty from "pino-pretty";
import WebSocket, { WebSocketServer } from "ws";

const app = express();
const logger = pino(pinoPretty());

app.use(cors());
app.use(
  bodyParser.json({
    type(req) {
      return true;
    },
  })
);
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});

const userState = [];

app.post("/new-user", async (request, response) => {
  if (Object.keys(request.body).length === 0) {
    const result = {
      status: "error",
      message: "This name is already taken!",
    };
    response.status(400).send(JSON.stringify(result)).end();
    return;
  }
  const { name } = request.body;
  const isExist = userState.find((user) => user.name === name);
  if (!isExist) {
    const newUser = {
      id: randomUUID(),
      name: name,
    };
    userState.push(newUser);
    const result = {
      status: "ok",
      user: newUser,
    };
    logger.info(`New user created: ${JSON.stringify(newUser)}`);
    response.send(JSON.stringify(result)).end();
  } else {
    const result = {
      status: "error",
      message: "This name is already taken!",
    };
    logger.error(`User with name "${name}" already exist`);
    response.status(409).send(JSON.stringify(result)).end();
  }
});

const server = http.createServer(app);
const wsServer = new WebSocketServer({ server });

wsServer.on("connection", (ws) => {
    let currentUser = null;

    // Отправляем текущий список пользователей новому клиенту
    ws.send(JSON.stringify(userState));

    ws.on("message", (msg, isBinary) => {
        try {
            const receivedMSG = JSON.parse(msg);
            logger.info(`Message received: ${JSON.stringify(receivedMSG)}`);

            // обработка выхода пользователя
            if (receivedMSG.type === "exit") {
                const idx = userState.findIndex(
                    (user) => user.id === receivedMSG.user.id
                );
                if (idx !== -1) {
                    const removedUser = userState.splice(idx, 1);
                    logger.info(`User "${removedUser[0].name}" has exited`);

                    // Отправляем обновленный список всем
                    [...wsServer.clients]
                        .filter((o) => o.readyState === WebSocket.OPEN)
                        .forEach((o) => o.send(JSON.stringify(userState)));
                }
                return;
            }

            // обработка отправки сообщения
            if (receivedMSG.type === "send") {
                currentUser = receivedMSG.user;
                receivedMSG.timestamp = new Date().toISOString();

                [...wsServer.clients]
                    .filter((o) => o.readyState === WebSocket.OPEN)
                    .forEach((o) => o.send(JSON.stringify(receivedMSG), { binary: isBinary }));
                logger.info("Message sent to all users");
            }
        } catch (error) {
            logger.error(`Error parsing message: ${error.message}`);
        }
    });

    // Обработка закрытия соединения (непредвиденное отключение)
    ws.on("close", () => {
        logger.info("Client disconnected");

        if (currentUser) {
            const idx = userState.findIndex((user) => user.id === currentUser.id);
            if (idx !== -1) {
                userState.splice(idx, 1);
                logger.info(`User "${currentUser.name}" removed due to connection close`);
            }
        }

        // Отправляем обновленный список всем оставшимся клиентам
        [...wsServer.clients]
            .filter((o) => o.readyState === WebSocket.OPEN)
            .forEach((o) => o.send(JSON.stringify(userState)));
    });
});

const port = process.env.PORT || 3000;

const bootstrap = async () => {
  try {
    server.listen(port, () =>
      logger.info(`Server has been started on http://localhost:${port}`)
    );
  } catch (error) {
    logger.error(`Error: ${error.message}`);
  }
};

bootstrap();
