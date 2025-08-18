const express = require("express");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http, { cors: { origin: "*" } });

app.use(express.static("public"));

// stan efemeryczny w RAM
const users = new Map();        // socketId -> {nick, age, country, state:"lobby"|"paired", peerId?:string}
function broadcastLobby() {
  const list = [];
  for (const [id, u] of users) if (u.state === "lobby") list.push({ id, nick:u.nick, age:u.age, country:u.country });
  io.emit("users", list);
}

io.on("connection", (socket) => {
  // klient wysyła profil po wejściu
  socket.on("join", (profile) => {
    users.set(socket.id, { nick: String(profile.nick||"Anon").slice(0,24),
                           age: String(profile.age||"ANY").slice(0,16),
                           country: String(profile.country||"ANY").slice(0,16),
                           state: "lobby" });
    broadcastLobby();
  });

  // zaproszenie do rozmowy 1:1
  socket.on("invite", (targetId) => {
    const me = users.get(socket.id);
    const target = users.get(targetId);
    if (!me || !target) return;
    if (me.state !== "lobby" || target.state !== "lobby") return;
    io.to(targetId).emit("invited", { id: socket.id, nick: me.nick, age: me.age, country: me.country });
  });

  // przyjęcie zaproszenia
  socket.on("accept", (fromId) => {
    const me = users.get(socket.id);
    const peer = users.get(fromId);
    if (!me || !peer) return;
    if (me.state !== "lobby" || peer.state !== "lobby") return;

    me.state = "paired"; me.peerId = fromId;
    peer.state = "paired"; peer.peerId = socket.id;

    io.to(socket.id).emit("paired", { id: fromId, nick: peer.nick });
    io.to(fromId).emit("paired", { id: socket.id, nick: me.nick });

    broadcastLobby(); // znikają z listy
  });

  // wiadomości tylko do sparowanego peer
  socket.on("message", (text) => {
    const me = users.get(socket.id);
    if (!me || me.state !== "paired" || !me.peerId) return;
    io.to(me.peerId).emit("message", { from: socket.id, text: String(text||"").slice(0,500) });
  });

  // zakończenie rozmowy
  socket.on("end", () => {
    const me = users.get(socket.id);
    if (!me || me.state !== "paired") return;
    const peerId = me.peerId;
    me.state = "lobby"; delete me.peerId;
    if (users.has(peerId)) {
      const p = users.get(peerId);
      p.state = "lobby"; delete p.peerId;
      io.to(peerId).emit("ended");
    }
    io.to(socket.id).emit("ended");
    broadcastLobby();
  });

  // rozłączenie klienta
  socket.on("disconnect", () => {
    const me = users.get(socket.id);
    if (me && me.state === "paired" && me.peerId && users.has(me.peerId)) {
      const p = users.get(me.peerId);
      p.state = "lobby"; delete p.peerId;
      io.to(me.peerId).emit("ended");
    }
    users.delete(socket.id);
    broadcastLobby();
  });
});

http.listen(process.env.PORT || 3000, () => {
  console.log("Let's Talk server up");
});
