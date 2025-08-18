// --- i18n dla interfejsu (PL/EN) ---
const I18N = {
  pl: {
    brand:"Let's Talk", terms:"Regulamin", privacy:"Polityka prywatności",
    motto:"Rozmowa z żywym człowiekiem. Anonimowo. Bez kont. Wiadomości znikają po zamknięciu okna.",
    sub:"Tylko tekst. Bez linków i multimediów.",
    enter:"Wejdź", nickLabel:"Nick", ageLabel:"Wiek", countryLabel:"Kraj",
    enterBtn:"Wejdź do lobby", hint:"Rekomendowane 18+. Korzystasz na własną odpowiedzialność.",
    lobby:"Wybierz rozmówcę", inviteHint:"Kliknij kafelek lub „Zaproś”.",
    sendBtn:"Wyślij", endBtn:"Zakończ"
  },
  en: {
    brand:"Let's Talk", terms:"Terms", privacy:"Privacy",
    motto:"Talk to a real human. Anonymous. No accounts. Messages disappear when you close the window.",
    sub:"Text only. No links or media.",
    enter:"Enter", nickLabel:"Nickname", ageLabel:"Age", countryLabel:"Country",
    enterBtn:"Enter lobby", hint:"18+ recommended. Use at your own risk.",
    lobby:"Choose a partner", inviteHint:"Click a tile or “Invite”.",
    sendBtn:"Send", endBtn:"End"
  }
};
const lang = ((navigator.language||"pl").slice(0,2).toLowerCase() in I18N) ? (navigator.language||"pl").slice(0,2).toLowerCase() : "en";
function applyI18n(){
  const d = I18N[lang];
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const key = el.getAttribute("data-i18n"); if (d[key]) el.textContent = d[key];
  });
  const input = document.getElementById("text");
  if (input) input.placeholder = lang==="pl" ? "Napisz wiadomość…" : "Type a message…";
}
applyI18n();

// --- PWA: SW + przycisk instalacji ---
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
let deferredPrompt=null;
const installBtn=document.getElementById("installBtn");
window.addEventListener("beforeinstallprompt",(e)=>{
  e.preventDefault(); deferredPrompt=e; installBtn.style.display="inline-block";
});
installBtn?.addEventListener("click",async()=>{
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  if(isIOS){ alert(lang==="pl"?"Na iOS użyj: Udostępnij → Do ekranu początkowego.":"On iOS use: Share → Add to Home Screen."); return; }
  if(!deferredPrompt) return;
  deferredPrompt.prompt(); await deferredPrompt.userChoice;
  deferredPrompt=null; installBtn.style.display="none";
});

// --- UI i czat ---
const $=(s)=>document.querySelector(s);
const entry=$("#entry"), lobby=$("#lobby"), chat=$("#chat"), list=$("#list"), meBox=$("#me"), peerEl=$("#peer"), log=$("#log");
window.addEventListener("load",()=>$("#nick")?.focus());

const socket=io(); let peerId=null;

$("#enterBtn").addEventListener("click",()=>{
  const nick=$("#nick").value||"Anon", age=$("#age").value||"ANY", country=$("#country").value||"ANY";
  socket.emit("join",{nick,age,country}); meBox.textContent=`${nick} · ${age} · ${country}`;
  entry.classList.add("hidden"); lobby.classList.remove("hidden");
});

socket.on("users",(arr)=>{
  list.innerHTML="";
  arr.filter(u=>u.id!==socket.id).forEach(u=>{
    const item=document.createElement("div"); item.className="item"; item.tabIndex=0;
    const meta=document.createElement("div"); meta.className="meta";
    meta.innerHTML=`<div class="line"><strong>${u.nick}</strong> · ${u.age} · ${u.country}</div>`;
    const btn=document.createElement("button"); btn.textContent= lang==="pl"?"Zaproś":"Invite";
    const inviteOnce=()=>{ if(btn.disabled) return; socket.emit("invite",u.id); btn.disabled=true; btn.classList.add("invited"); btn.textContent= lang==="pl"?"Wysłano…":"Sent…"; };
    btn.addEventListener("click",(e)=>{e.stopPropagation(); inviteOnce();});
    item.addEventListener("click",inviteOnce);
    item.addEventListener("keypress",(e)=>{ if(e.key==="Enter"||e.key===" ") inviteOnce(); });
    item.appendChild(meta); item.appendChild(btn); list.appendChild(item);
  });
});

socket.on("invited",(user)=>{ if(confirm((lang==="pl"?"Rozmowa z ":"Chat with ")+user.nick+"?")) socket.emit("accept",user.id); });

socket.on("paired",(user)=>{
  peerId=user.id; lobby.classList.add("hidden"); chat.classList.remove("hidden");
  peerEl.textContent=user.nick; log.innerHTML=""; setTimeout(()=>$("#text")?.focus(),30);
});

document.getElementById("sendForm").addEventListener("submit",(e)=>{
  e.preventDefault(); const input=$("#text"); const text=input.value.trim(); if(!text) return;
  socket.emit("message",text); addMsg("me",text); input.value=""; input.focus();
});

socket.on("message",(msg)=>addMsg("peer",msg.text));
document.getElementById("endBtn").addEventListener("click",()=>socket.emit("end"));
socket.on("ended",()=>{ chat.classList.add("hidden"); lobby.classList.remove("hidden"); peerId=null; setTimeout(()=>{ const first=list.querySelector(".item"); if(first) first.focus(); },30); });

function addMsg(kind,text){
  const row=document.createElement("div"); row.className="msg "+(kind==="me"?"me":"peer");
  const bubble=document.createElement("div"); bubble.className="bubble"; bubble.textContent=text;
  row.appendChild(bubble); log.appendChild(row); log.scrollTop=log.scrollHeight;
}
