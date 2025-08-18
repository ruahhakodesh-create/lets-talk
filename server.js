const express = require("express");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);

app.use(express.static("public"));

let users = {};

io.on("connection", (socket) => {
  socket.on("join", (data) => {
    users[socket.id] = { ...data, id: socket.id };
    io.emit("users", Object.values(users));
  });

  socket.on("invite", (targetId) => {
    if (users[targetId]) {
      io.to(targetId).emit("invited", users[socket.id]);
    }
  });

  socket.on("accept", (targetId) => {
    if (users[targetId]) {
      io.to(targetId).emit("accepted", users[socket.id]);
    }
  });

  socket.on("message", (msg) => {
    io.to(msg.to).emit("message", { from: socket.id, text: msg.text });
  });

  socket.on("disconnect", () => {
    delete users[socket.id];
    io.emit("users", Object.values(users));
  });
});

http.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
