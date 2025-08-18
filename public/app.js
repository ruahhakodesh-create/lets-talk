const socket = io();

// Sekcje / elementy
const intro   = document.getElementById('intro');
const start   = document.getElementById('start');
const lobby   = document.getElementById('lobby');
const chat    = document.getElementById('chat');

const meBadge = document.getElementById('meBadge');
const infoBox = document.getElementById('info');
const peerName= document.getElementById('peerName');

const joinForm = document.getElementById('joinForm');
const nickInput= document.getElementById('nickname');

const randBtn        = document.getElementById('randBtn');
const searchBtn      = document.getElementById('searchBtn');
const searchNick     = document.getElementById('searchNick');
const onlineBtn      = document.getElementById('onlineBtn');

const lobbyRand      = document.getElementById('lobbyRand');
const lobbySearchBtn = document.getElementById('lobbySearchBtn');
const lobbySearchNick= document.getElementById('lobbySearchNick');

const messages = document.getElementById('messages');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const endBtn  = document.getElementById('endBtn');

let myNick = null;
let roomId = null;

// Wejście do lobby (rejestracja nicka)
joinForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const nick = nickInput.value.trim();
  if(!nick){ alert('Podaj pseudonim.'); return; }
  myNick = nick;
  socket.emit('join', { nick: myNick });
});

// Szybkie akcje ze strony startowej (działają dopiero po dołączeniu)
randBtn.addEventListener('click', ()=>tryBeforeJoin(()=> socket.emit('invite_random')));
searchBtn.addEventListener('click', ()=>{
  tryBeforeJoin(()=>{
    const target = (searchNick.value||'').trim();
    if(!target){ alert('Podaj pseudonim do wyszukania.'); return; }
    socket.emit('invite_nick',{ target });
  });
});
onlineBtn.addEventListener('click', (e)=>{ /* tylko walidacja nicka przez submit */ });

// W lobby
lobbyRand.addEventListener('click', ()=> socket.emit('invite_random'));
lobbySearchBtn.addEventListener('click', ()=>{
  const target = (lobbySearchNick.value||'').trim();
  if(!target){ alert('Podaj pseudonim.'); return; }
  socket.emit('invite_nick',{ target });
});

// Czat
chatForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const text = messageInput.value.trim();
  if(!text || !roomId) return;
  socket.emit('message', { roomId, text });
  appendMsg(text, true);
  messageInput.value = '';
});
endBtn.addEventListener('click', ()=>{
  if(roomId) socket.emit('chat_end', { roomId });
  resetToLobby('Rozmowa zakończona.');
});

// ====== SOCKET.IO ZDARZENIA ======
socket.on('joined', ({ nick, safeNick })=>{
  myNick = safeNick || nick;
  meBadge.textContent = `Jesteś: ${myNick}`;
  intro.classList.add('hidden');
  start.classList.add('hidden');
  lobby.classList.remove('hidden');
  info('Dołączono do lobby. Wybierz „Losowy rozmówca” lub wyszukaj pseudonim.');
});

socket.on('nick_error', ({ reason })=>{
  alert(reason || 'Błąd pseudonimu');
});

socket.on('invited', ({ from })=>{
  const ok = confirm(`Zaproszenie do rozmowy od: ${from}. Przyjąć?`);
  socket.emit('invite_response', { from, accept: !!ok });
  if(!ok) info(`Odrzucono zaproszenie od: ${from}.`);
});

socket.on('invite_sent', ({ to })=>{
  info(`Wysłano zaproszenie do: ${to}. Oczekiwanie na odpowiedź…`);
});

socket.on('invite_fail', ({ reason })=>{
  info(`Nie udało się wysłać zaproszenia: ${reason}`);
});

socket.on('chat_start', ({ roomId:rid, partner })=>{
  roomId = rid;
  lobby.classList.add('hidden');
  chat.classList.remove('hidden');
  peerName.textContent = partner;
  messages.innerHTML = '';
  appendSys(`Połączono z: ${partner}`);
});

socket.on('message', ({ text, from })=>{
  appendMsg(from ? `${from}: ${text}` : text, false);
});

socket.on('chat_ended', ({ reason })=>{
  resetToLobby(reason || 'Rozmowa zakończona.');
});

socket.on('info', ({ text })=> info(text));

// ====== POMOCNICZE ======
function tryBeforeJoin(fn){
  const nick = nickInput.value.trim();
  if(!nick){ alert('Najpierw wpisz swój pseudonim i wejdź do lobby.'); return; }
  if(!myNick){ socket.emit('join', { nick }); }
  setTimeout(fn, 100);
}
function appendMsg(t, me=false){
  const d = document.createElement('div');
  d.className = 'msg' + (me ? ' me' : '');
  d.textContent = me ? `Ty: ${t}` : t;
  messages.appendChild(d);
  messages.scrollTop = messages.scrollHeight;
}
function appendSys(t){ appendMsg(t,false); }
function info(t){
  infoBox.textContent = t || '';
}
function resetToLobby(msg){
  roomId = null;
  chat.classList.add('hidden');
  lobby.classList.remove('hidden');
  info(msg);
}
