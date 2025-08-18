// Sekcje
const intro = document.getElementById('intro');
const start = document.getElementById('start');
const chat  = document.getElementById('chat');

// Start rozmowy
document.getElementById('joinForm').addEventListener('submit', e=>{
  e.preventDefault();
  const nick = document.getElementById('nickname').value.trim();
  const purpose = document.getElementById('purpose').value;

  if(!nick){ alert('Podaj pseudonim.'); return; }
  if(!purpose){ alert('Wybierz cel rozmowy.'); return; }

  intro.classList.add('hidden');
  start.classList.add('hidden');
  chat.classList.remove('hidden');

  const msg = document.createElement('div');
  msg.style.fontStyle='italic';
  msg.textContent = `Rozpoczynasz rozmowę jako „${nick}” (cel: ${opisCelu(purpose)}).`;
  document.getElementById('messages').appendChild(msg);
});

// Prosty czat UI (placeholder)
document.getElementById('chatForm').addEventListener('submit', e=>{
  e.preventDefault();
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  if(!text) return;
  const div = document.createElement('div');
  div.textContent = text;
  document.getElementById('messages').appendChild(div);
  input.value='';
  const box = document.getElementById('messages');
  box.scrollTop = box.scrollHeight;
});

function opisCelu(v){
  if(v==='relacje') return 'Nawiązanie relacji';
  if(v==='wsparcie') return 'Szukam wsparcia';
  if(v==='doswiadczenia') return 'Wymiana doświadczeń';
  return v;
}
