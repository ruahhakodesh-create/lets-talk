const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const STATIC_DIR = path.join(__dirname, 'public');
app.use(express.static(STATIC_DIR));
app.get('*', (req,res)=> res.sendFile(path.join(STATIC_DIR,'index.html')));

// ====== PROSTA LOGIKA MATCHINGU ======
/**
 * users: Map<socket.id, {nick, busy:false|true, roomId:null|string}>
 * nicks: Map<nickLower, socket.id>
 */
const users = new Map();
const nicks = new Map();

function safeNick(nick){
  return String(nick||'Anon').slice(0,24).replace(/[<>]/g,'');
}
function pickRandomAvailable(exceptId){
  const pool = [...users.entries()].filter(([sid,u])=> sid!==exceptId && !u.busy);
  if(!pool.length) return null;
  const idx = Math.floor(Math.random()*pool.length);
  const [sid, u] = pool[idx];
  return { sid, u };
}
function startChat(aId, bId){
  const roomId = `room:${aId}:${bId}`;
  const a = users.get(aId); const b = users.get(bId);
  if(!a || !b) return;
  a.busy = b.busy = true; a.roomId = b.roomId = roomId;

  const aNick = a.nick, bNick = b.nick;
  io.to(aId).emit('chat_start', { roomId, partner: bNick });
  io.to(bId).emit('chat_start', { roomId, partner: aNick });

  io.to(aId).emit('info',{text:`Połączono z: ${bNick}`});
  io.to(bId).emit('info',{text:`Połączono z: ${aNick}`});
}

io.on('connection', (socket)=>{

  socket.on('join', ({ nick })=>{
    const raw = safeNick(nick);
    let final = raw;
    const base = raw.toLowerCase();

    // unikalność nicka
    if(nicks.has(base)){
      // dodaj sufiks
      let i=2;
      while(nicks.has((raw + i).toLowerCase())) i++;
      final = raw + i;
    }

    users.set(socket.id, { nick: final, busy:false, roomId:null });
    nicks.set(final.toLowerCase(), socket.id);
    socket.emit('joined', { nick, safeNick: final });
  });

  socket.on('invite_random', ()=>{
    const me = users.get(socket.id);
    if(!me){ socket.emit('info',{text:'Najpierw wejdź do lobby.'}); return; }
    if(me.busy){ socket.emit('info',{text:'Już jesteś w rozmowie.'}); return; }

    const pick = pickRandomAvailable(socket.id);
    if(!pick){ socket.emit('invite_fail',{reason:'Brak dostępnych rozmówców.'}); return; }

    const targetId = pick.sid;
    const target = pick.u;
    io.to(targetId).emit('invited', { from: me.nick });
    socket.emit('invite_sent', { to: target.nick });
    // oczekiwanie na odpowiedź w 'invite_response'
    target.pendingFrom = socket.id;
  });

  socket.on('invite_nick', ({ target })=>{
    const me = users.get(socket.id);
    if(!me){ socket.emit('info',{text:'Najpierw wejdź do lobby.'}); return; }
    if(me.busy){ socket.emit('info',{text:'Już jesteś w rozmowie.'}); return; }

    const tId = nicks.get(String(target||'').toLowerCase());
    if(!tId || !users.has(tId)) { socket.emit('invite_fail',{reason:'Taki pseudonim nie jest dostępny.'}); return; }
    const t = users.get(tId);
    if(t.busy){ socket.emit('invite_fail',{reason:'Użytkownik jest w rozmowie.'}); return; }

    io.to(tId).emit('invited', { from: me.nick });
    socket.emit('invite_sent', { to: t.nick });
    t.pendingFrom = socket.id;
  });

  socket.on('invite_response', ({ from, accept })=>{
    const me = users.get(socket.id);
    if(!me) return;
    const fromId = nicks.get(String(from||'').toLowerCase());
    if(!fromId || !users.has(fromId)) return;

    const inviter = users.get(fromId);
    // sprawdź, czy to faktycznie oczekiwane zaproszenie
    if(me.pendingFrom !== fromId){ return; }
    me.pendingFrom = undefined;

    if(!accept){
      io.to(fromId).emit('invite_fail',{reason:`${me.nick} odrzucił zaproszenie.`});
      return;
    }
    if(inviter.busy || me.busy){
      io.to(fromId).emit('invite_fail',{reason:'Ktoś zajął rozmowę wcześniej.'});
      return;
    }
    startChat(fromId, socket.id);
  });

  socket.on('message', ({ roomId, text })=>{
    const me = users.get(socket.id);
    if(!me || me.roomId !== roomId) return;
    const peerId = [...users.entries()].find(([sid,u])=> u.roomId===roomId && sid!==socket.id)?.[0];
    if(peerId) io.to(peerId).emit('message', { text, from: me.nick });
  });

  socket.on('chat_end', ({ roomId })=>{
    const me = users.get(socket.id);
    if(!me || me.roomId !== roomId) return;
    const peerId = [...users.entries()].find(([sid,u])=> u.roomId===roomId && sid!==socket.id)?.[0];

    me.busy=false; me.roomId=null;
    if(peerId && users.has(peerId)){ const p=users.get(peerId); p.busy=false; p.roomId=null; io.to(peerId).emit('chat_ended',{reason:'Druga strona zakończyła rozmowę.'}); }
    io.to(socket.id).emit('chat_ended',{reason:'Rozmowę zakończono.'});
  });

  socket.on('disconnect', ()=>{
    const me = users.get(socket.id);
    if(!me){ return; }
    // jeśli w rozmowie, powiadom partnera
    if(me.roomId){
      const peerId = [...users.entries()].find(([sid,u])=> u.roomId===me.roomId && sid!==socket.id)?.[0];
      if(peerId && users.has(peerId)){ const p=users.get(peerId); p.busy=false; p.roomId=null; io.to(peerId).emit('chat_ended',{reason:'Rozmówca się rozłączył.'}); }
    }
    nicks.delete(me.nick.toLowerCase());
    users.delete(socket.id);
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log('Let’s Talk up on', PORT));
