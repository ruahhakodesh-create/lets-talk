const socket = io();

const intro   = document.getElementById('intro');
const start   = document.getElementById('start');
const chatSec = document.getElementById('chat');

const nickIn    = document.getElementById('nick');
const btnRandom = document.getElementById('btnRandom');
const btnFind   = document.getElementById('btnFind');
const findNick  = document.getElementById('findNick');

const meName  = document.getElementById('meName');
const peerName= document.getElementById('peerName');
const sys     = document.getElementById('sys');
const box     = document.getElementById('messages');
const chatForm= document.getElementById('chatForm');
const msgIn   = document.getElementById('messageInput');
const endBtn  = document.getElementById('endBtn');

let roomId = null;
let helloDone = false;
let pending = null;

function add(t, me=false){
  const d=document.createElement('div');
  d.className='msg'+(me?' me':'');
  d.textContent=t;
  box.appendChild(d);
  box.scrollTop = box.scrollHeight;
}
function showChat(){
  intro.classList.add('hidden');
  start.classList.add('hidden');
  chatSec.classList.remove('hidden');
}
function ensureHello(cb){
  const me = nickIn.value.trim();
  if(!me){ alert('Podaj pseudonim.'); return; }
  if(!helloDone){ pending=cb; socket.emit('hello',{nick:me}); }
  else cb();
}

socket.on('hello_ok', ({nick})=>{
  helloDone = true;
  meName.textContent = nick;
  showChat();
  if(pending){ const f=pending; pending=null; f(); }
});

btnRandom.addEventListener('click', ()=>{
  ensureHello(()=>{
    sys.textContent = 'Czekasz na losowego rozmówcę…';
    socket.emit('queue_random');
  });
});
btnFind.addEventListener('click', ()=>{
  const target = findNick.value.trim();
  if(!target){ alert('Podaj pseudonim do wyszukania.'); return; }
  ensureHello(()=>{
    sys.textContent = `Wysyłam zaproszenie do: ${target}…`;
    socket.emit('invite_nick',{target});
  });
});

socket.on('invited', ({from})=>{
  const ok = confirm(`Zaproszenie od: ${from}. Przyjąć?`);
  socket.emit('invite_response',{from,accept:!!ok});
  if(!ok) add(`Odrzucono zaproszenie od: ${from}.`);
});
socket.on('invite_sent', ({to})=> add(`Wysłano zaproszenie do: ${to}. Oczekiwanie…`));
socket.on('invite_fail', ({reason})=> add(`Nie udało się połączyć: ${reason}`));
socket.on('info', ({text})=> sys.textContent = text || '';

socket.on('chat_start', ({roomId:rid, partner})=>{
  roomId = rid;
  sys.textContent = '';
  peerName.textContent = partner;
  box.innerHTML = '';
  add(`Połączono z: ${partner}`);
});
socket.on('message', ({text,from})=> add(from?`${from}: ${text}`:text));
socket.on('chat_ended', ({reason})=>{
  add(reason||'Rozmowa zakończona.');
  roomId = null;
});

chatForm.addEventListener('submit', e=>{
  e.preventDefault();
  if(!roomId) return;
  const t = msgIn.value.trim(); if(!t) return;
  socket.emit('message',{roomId,text:t});
  add(`Ty: ${t}`, true);
  msgIn.value='';
});
endBtn.addEventListener('click', ()=>{
  if(roomId) socket.emit('chat_end',{roomId});
  add('Zakończyłeś rozmowę.');
  roomId=null;
});
