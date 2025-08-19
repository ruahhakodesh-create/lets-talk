const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const STATIC_DIR = path.join(__dirname, 'public');
app.use(express.static(STATIC_DIR));
app.get('*', (req, res) => res.sendFile(path.join(STATIC_DIR, 'index.html')));

/** Użytkownicy i kojarzenie */
const users = new Map();          // socket.id -> {nick, busy:false, roomId:null}
const nicks = new Map();          // lower(nick) -> socket.id
const randomQueue = [];           // socket.id czekające na losowe

function safeNick(n) { return String(n || 'Anon').slice(0, 24).replace(/[<>]/g, ''); }
function roomOf(a, b) { return `room:${[a, b].sort().join(':')}`; }

function enqueueRandom(id) {
  if (!randomQueue.includes(id)) randomQueue.push(id);
  tryMatchRandom();
}
function tryMatchRandom() {
  while (randomQueue.length >= 2) {
    const a = randomQueue.shift();
    const b = randomQueue.shift();
    if (!users.has(a) || !users.has(b)) continue;
    const ua = users.get(a), ub = users.get(b);
    if (ua.busy || ub.busy) continue;
    startChat(a, b);
  }
}
function startChat(aId, bId) {
  const a = users.get(aId), b = users.get(bId);
  if (!a || !b) return;
  const rid = roomOf(aId, bId);
  a.busy = b.busy = true; a.roomId = b.roomId = rid;
  io.to(aId).emit('chat_start', { roomId: rid, partner: b.nick });
  io.to(bId).emit('chat_start', { roomId: rid, partner: a.nick });
}

io.on('connection', (socket) => {
  /** rejestracja nicka */
  socket.on('hello', ({ nick }) => {
    const raw = safeNick(nick);
    let final = raw, base = raw.toLowerCase(), i = 2;
    while (nicks.has(final.toLowerCase())) { final = raw + i; i++; }
    users.set(socket.id, { nick: final, busy: false, roomId: null });
    nicks.set(final.toLowerCase(), socket.id);
    socket.emit('hello_ok', { nick: final });
  });

  /** tryb losowy */
  socket.on('queue_random', () => {
    const me = users.get(socket.id);
    if (!me) return;
    if (me.busy) return;
    enqueueRandom(socket.id);
    socket.emit('info', { text: 'Czekasz na losowego rozmówcę…' });
  });

  /** zaproszenie po nicku */
  socket.on('invite_nick', ({ target }) => {
    const me = users.get(socket.id);
    if (!me) return;
    if (me.busy) { socket.emit('invite_fail', { reason: 'Już jesteś w rozmowie.' }); return; }

    const tId = nicks.get(String(target || '').toLowerCase());
    if (!tId || !users.has(tId)) { socket.emit('invite_fail', { reason: 'Użytkownik niedostępny.' }); return; }
    const t = users.get(tId);
    if (t.busy) { socket.emit('invite_fail', { reason: 'Użytkownik jest w rozmowie.' }); return; }

    io.to(tId).emit('invited', { from: me.nick });
    socket.emit('invite_sent', { to: t.nick });
    t.pendingFrom = socket.id;
  });

  /** odpowiedź na zaproszenie */
  socket.on('invite_response', ({ from, accept }) => {
    const me = users.get(socket.id);
    if (!me) return;
    const fromId = nicks.get(String(from || '').toLowerCase());
    if (!fromId || !users.has(fromId)) return;
    if (me.pendingFrom !== fromId) return;
    me.pendingFrom = undefined;

    if (!accept) { io.to(fromId).emit('invite_fail', { reason: `${me.nick} odrzucił zaproszenie.` }); return; }
    const inv = users.get(fromId);
    if (!inv || inv.busy || me.busy) { io.to(fromId).emit('invite_fail', { reason: 'Zaproszenie nieaktualne.' }); return; }
    startChat(fromId, socket.id);
  });

  /** wiadomość */
  socket.on('message', ({ roomId, text }) => {
    const me = users.get(socket.id);
    if (!me || me.roomId !== roomId) return;
    for (const [sid, u] of users.entries()) {
      if (u.roomId === roomId && sid !== socket.id) {
        io.to(sid).emit('message', { text, from: me.nick });
      }
    }
  });

  /** zakończenie rozmowy */
  socket.on('chat_end', ({ roomId }) => {
    const me = users.get(socket.id);
    if (!me || me.roomId !== roomId) return;
    for (const [sid, u] of users.entries()) {
      if (u.roomId === roomId) { u.busy = false; u.roomId = null; if (sid !== socket.id) io.to(sid).emit('chat_ended', { reason: 'Rozmówca zakończył rozmowę.' }); }
    }
    io.to(socket.id).emit('chat_ended', { reason: 'Rozmowa zakończona.' });
  });

  socket.on('disconnect', () => {
    // usuń z kolejki losowej
    const idx = randomQueue.indexOf(socket.id);
    if (idx >= 0) randomQueue.splice(idx, 1);

    const me = users.get(socket.id);
    if (!me) return;
    // jeśli był w pokoju, powiadom partnera
    if (me.roomId) {
      for (const [sid, u] of users.entries()) {
        if (u.roomId === me.roomId && sid !== socket.id) {
          u.busy = false; u.roomId = null;
          io.to(sid).emit('chat_ended', { reason: 'Rozmówca się rozłączył.' });
        }
      }
    }
    nicks.delete(me.nick.toLowerCase());
    users.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Let’s Talk running on', PORT));
