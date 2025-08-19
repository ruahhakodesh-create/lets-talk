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

function addLine(html){
  const d=document.createElement('div');
  d.className='msg';
  d.innerHTML = html;
  box.appendChild(d);
  box.scrollTop = box.scrollHeight;
}
function addMine(text){
  const d=document.createElement('div');
  d.className='msg me';
  d.textContent = `Ty: ${text}`;
  box.appendChild(d);
  box.scrollTop = box.scrollHeight;
}
function showChat(){
  intro.classList.add('hidden');
  start.classList.add('hidden');
  chatSec.classList.remove('hidden');
}
function myLang(){
  return (navigator.language || 'pl').toLowerCase().split('-')[0];
}
function ensureHello(cb){
  const me = nickIn.value.trim();
  if(!me){ alert('Podaj pseudonim.'); return; }
  if(!helloDone){ pending=cb; socket.emit('hello',{nick:me, lang: myLang()}); }
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
  if(!ok) addLine(`Odrzucono zaproszenie od: <strong>${from}</strong>.`);
});
socket.on('invite_sent', ({to})=> addLine(`Wysłano zaproszenie do: <strong>${to}</strong>. Oczekiwanie…`));
socket.on('invite_fail', ({reason})=> addLine(`Nie udało się połączyć: ${reason}`));
socket.on('info', ({text})=> sys.textContent = text || '';

socket.on('chat_start', ({roomId:rid, partner})=>{
  roomId = rid;
  sys.textContent = '';
  peerName.textContent = partner;
  box.innerHTML = '';
  addLine(`Połączono z: <strong>${partner}</strong>`);
});

// Serwer wysyła: { text, text_tr?, from, lang_from, lang_to }
socket.on('message', (m)=>{
  const show = m.text_tr || m.text;
  const extra = m.text_tr ? `<div style="opacity:.7;font-size:.9em">Oryg.: ${escapeHtml(m.text)}</div>` : '';
  addLine(`<strong>${escapeHtml(m.from)}:</strong> ${escapeHtml(show)}${extra}`);
});

socket.on('chat_ended', ({reason})=>{
  addLine(reason||'Rozmowa zakończona.');
  roomId = null;
});

chatForm.addEventListener('submit', e=>{
  e.preventDefault();
  if(!roomId) return;
  const t = msgIn.value.trim(); if(!t) return;
  socket.emit('message',{roomId,text:t});
  addMine(t);
  msgIn.value='';
});
endBtn.addEventListener('click', ()=>{
  if(roomId) socket.emit('chat_end',{roomId});
  addLine('Zakończyłeś rozmowę.');
  roomId=null;
});

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}
