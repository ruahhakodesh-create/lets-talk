// Logika widoczności: najpierw intro+formularz, po starcie czat
const joinForm = document.getElementById("joinForm");
const chatSection = document.getElementById("chat");
const introSection = document.querySelector(".intro");
const formSection  = document.querySelector(".form");

joinForm.addEventListener("submit", (e)=>{
  e.preventDefault();
  const nick = document.getElementById("nickname").value.trim();
  const purpose = document.getElementById("purpose").value;

  if (!nick) { alert("Podaj pseudonim."); return; }
  if (!purpose) { alert("Wybierz cel rozmowy."); return; }

  // Schowaj panele wejściowe, pokaż czat
  intro.classList.add('hidden');
  form.classList.add('hidden');
  chat.classList.remove('hidden');


  // Powitalna wiadomość w czacie
  const messages = document.getElementById("messages");
  const hello = document.createElement("div");
  hello.style.fontStyle = "italic";
  hello.textContent = `Rozpoczynasz rozmowę jako „${nick}” (cel: ${opisCelu(purpose)}).`;
  messages.appendChild(hello);
});

// Prosty czat lokalny (UI). Backend możesz podpiąć później.
document.getElementById("chatForm").addEventListener("submit",(e)=>{
  e.preventDefault();
  const input = document.getElementById("messageInput");
  const txt = input.value.trim();
  if (!txt) return;
  const messages = document.getElementById("messages");
  const bubble = document.createElement("div");
  bubble.textContent = txt;
  messages.appendChild(bubble);
  input.value = "";
  messages.scrollTop = messages.scrollHeight;
});

function opisCelu(v){
  if (v==="relacje") return "Nawiązanie relacji";
  if (v==="wsparcie") return "Szukam wsparcia";
  if (v==="doswiadczenia") return "Wymiana doświadczeń";
  return v;
}
