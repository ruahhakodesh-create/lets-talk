// PWA: SW + install prompt
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}
let deferredPrompt = null;
const installBtn = document.getElementById("installBtn");
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = "inline-block";
});
installBtn?.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.style.display = "none";
});

// UI helpers
const $ = (s) => document.querySelector(s);
const entry  = $("#entry");
const lobby  = $("#lobby");
const chat   = $("#chat");
const list   = $("#list");
const meBox  = $("#me");
const peerEl = $("#peer");
const log    = $("#log");

// Autofocus na starcie
window.addEventListener("load", () => $("#nick")?.focus());

// Socket
const socket = io();
let peerId = null;

// Wejście do lobby
$("#enterBtn").addEventListener("click", () => {
  const nick = $("#nick").value || "Anon";
  const age = $("#age").value || "ANY";
  const country = $("#country").value || "ANY";

  socket.emit("join", { nick, age, country });
  meBox.textContent = `${nick} · ${age} · ${country}`;

  entry.classList.add("hidden");
  lobby.classList.remove("hidden");
});

// Lista rozmówców
socket.on("users", (arr) => {
  list.innerHTML = "";
  arr
    .filter((u) => u.id !== socket.id)
    .forEach((u) => {
      const item = document.createElement("div");
      item.className = "item";
      item.tabIndex = 0;

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.innerHTML = `<div class="line"><strong>${u.nick}</strong> · ${u.age} · ${u.country}</div>`;

      const btn = document.createElement("button");
      btn.textContent = "Zaproś";

      // Jeden punkt wejścia do akcji + blokada podwójnego kliku
      const inviteOnce = () => {
        if (btn.disabled) return;
        socket.emit("invite", u.id);
        btn.disabled = true;
        btn.classList.add("invited");
        btn.textContent = "Wysłano…";
      };
      btn.addEventListener("click", (e) => { e.stopPropagation(); inviteOnce(); });
      item.addEventListener("click", inviteOnce);
      item.addEventListener("keypress", (e) => { if (e.key === "Enter" || e.key === " ") inviteOnce(); });

      item.appendChild(meta); item.appendChild(btn);
      list.appendChild(item);
    });
});

// Zaproszenie przychodzi
socket.on("invited", (user) => {
  const ok = confirm(`Rozmowa z ${user.nick}?`);
  if (ok) socket.emit("accept", user.id);
});

// Sparowanie
socket.on("paired", (user) => {
  peerId = user.id;
  lobby.classList.add("hidden");
  chat.classList.remove("hidden");
  peerEl.textContent = user.nick;
  log.innerHTML = "";
  setTimeout(() => $("#text")?.focus(), 30); // autofocus po wejściu do czatu
});

// Wysyłanie wiadomości
$("#sendForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("#text");
  const text = input.value.trim();
  if (!text) return;
  socket.emit("message", text);
  addMsg("me", text);
  input.value = "";
  input.focus(); // kursor pozostaje aktywny
});

// Odbiór wiadomości
socket.on("message", (msg) => addMsg("peer", msg.text));

// Zakończenie rozmowy
$("#endBtn").addEventListener("click", () => socket.emit("end"));
socket.on("ended", () => {
  chat.classList.add("hidden");
  lobby.classList.remove("hidden");
  peerId = null;
  setTimeout(() => {
    const first = list.querySelector(".item");
    if (first) first.focus(); // focus ring po powrocie
  }, 30);
});

// Render bańki
function addMsg(kind, text) {
  const row = document.createElement("div");
  row.className = "msg " + (kind === "me" ? "me" : "peer");
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  row.appendChild(bubble);
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
}
