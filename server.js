const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

/** Prosty matching 1:1 **/
const users = new Map(); // id -> {nick,busy:false,roomId:null,pendingFrom?:id}
const nicks = new Map(); // lower(nick) -> id
const randomQueue = [];  // id czekające na losowe

const cleanNick = s => String(s||'Anon').slice(0,24).replace(/[<>]/g,'');
const roomOf = (a,b)=>`room:${[a,b].sort().join(':')}`;

function enqueueRandom(id){
  if(!randomQueue.includes(id)) randomQueue.push(id);
  matchRandom();
}
function matchRandom(){
  while(randomQueue.length>=2){
    const a=randomQueue.shift(), b=randomQueue.shift();
    if(!users.has(a)||!users.has(b)) continue;
    const ua=users.get(a), ub=users.get(b);
    if(ua.busy||ub.busy) continue;
    startChat(a,b);
  }
}
function startChat(aId,bId){
  const a=users.get(aId), b=users.get(bId);
  if(!a||!b) return;
  const rid=roomOf(aId,bId);
  a.busy=b.busy=true; a.roomId=b.roomId=rid;
  io.to(aId).emit('chat_start',{roomId:rid,partner:b.nick});
  io.to(bId).emit('chat_start',{roomId:rid,partner:a.nick});
}

io.on('connection', (socket)=>{

  socket.on('hello', ({nick})=>{
    const raw=cleanNick(nick);
    let fin=raw, i=2;
    while(nicks.has(fin.toLowerCase())) { fin=raw+i; i++; }
    users.set(socket.id,{nick:fin,busy:false,roomId:null});
    nicks.set(fin.toLowerCase(),socket.id);
    socket.emit('hello_ok',{nick:fin});
  });

  socket.on('queue_random', ()=>{
    const me=users.get(socket.id); if(!me||me.busy) return;
    enqueueRandom(socket.id);
    socket.emit('info',{text:'Czekasz na losowego rozmówcę…'});
  });

  socket.on('invite_nick', ({target})=>{
    const me=users.get(socket.id); if(!me) return;
    if(me.busy) { socket.emit('invite_fail',{reason:'Już jesteś w rozmowie.'}); return; }
    const tId = nicks.get(String(target||'').toLowerCase());
    if(!tId||!users.has(tId)) { socket.emit('invite_fail',{reason:'Użytkownik niedostępny.'}); return; }
    const t=users.get(tId);
    if(t.busy){ socket.emit('invite_fail',{reason:'Użytkownik jest w rozmowie.'}); return; }
    io.to(tId).emit('invited',{from:me.nick});
    socket.emit('invite_sent',{to:t.nick});
    t.pendingFrom=socket.id;
  });

  socket.on('invite_response', ({from,accept})=>{
    const me=users.get(socket.id); if(!me) return;
    const fromId=nicks.get(String(from||'').toLowerCase());
    if(!fromId||!users.has(fromId)) return;
    if(me.pendingFrom!==fromId) return;
    me.pendingFrom=undefined;
    if(!accept){ io.to(fromId).emit('invite_fail',{reason:`${me.nick} odrzucił zaproszenie.`}); return; }
    const inv=users.get(fromId);
    if(!inv||inv.busy||me.busy){ io.to(fromId).emit('invite_fail',{reason:'Zaproszenie nieaktualne.'}); return; }
    startChat(fromId,socket.id);
  });

  socket.on('message', ({roomId,text})=>{
    const me=users.get(socket.id);
    if(!me||me.roomId!==roomId) return;
    for(const [sid,u] of users.entries()){
      if(u.roomId===roomId && sid!==socket.id)
        io.to(sid).emit('message',{text,from:me.nick});
    }
  });

  socket.on('chat_end', ({roomId})=>{
    const me=users.get(socket.id); if(!me||me.roomId!==roomId) return;
    for(const [sid,u] of users.entries()){
      if(u.roomId===roomId){
        u.busy=false; u.roomId=null;
        if(sid!==socket.id) io.to(sid).emit('chat_ended',{reason:'Rozmówca zakończył rozmowę.'});
      }
    }
    io.to(socket.id).emit('chat_ended',{reason:'Rozmowa zakończona.'});
  });

  socket.on('disconnect', ()=>{
    const qIdx=randomQueue.indexOf(socket.id);
    if(qIdx>=0) randomQueue.splice(qIdx,1);
    const me=users.get(socket.id); if(!me) return;
    if(me.roomId){
      for(const [sid,u] of users.entries()){
        if(u.roomId===me.roomId && sid!==socket.id){
          u.busy=false; u.roomId=null;
          io.to(sid).emit('chat_ended',{reason:'Rozmówca się rozłączył.'});
        }
      }
    }
    nicks.delete(me.nick.toLowerCase());
    users.delete(socket.id);
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log('LetsTalk on', PORT));
