const socket = io();
let peerId = null;

const $ = (s) => document.querySelector(s);
const entry = $("#entry");
const lobby = $("#lobby");
const chat = $("#chat");
const userList = $("#userList");
const peerName = $("#peerName");
const messages = $("#messages");

// Wejście z profilem
$("#joinForm").onsubmit = (e) => {
  e.preventDefault();
  const f = e.target;
  socket.emit("join", {
    nick: f.nick.value,
    age: f.age.value,
    country: f.country.value,
  });
  entry.classList.add("hidden");
  lobby.classList.remove("hidden");
};

// Lista dostępnych (ukryj mnie samego)
socket.on("users", (list) => {
  userList.innerHTML = "";
  list
    .filter((u) => u.id !== socket.id)
    .forEach((u) => {
      const li = document.createElement("li");
      li.textContent = `${u.nick} (${u.age}, ${u.country})`;
      li.onclick = () => socket.emit("invite", u.id);
      userList.appendChild(li);
    });
});

// Zaproszenie do rozmowy
socket.on("invited", (user) => {
  if (confirm(`Rozmowa z ${user.nick}?`)) {
    socket.emit("accept", user.id);
  }
});

// Sparowanie
socket.on("paired", (user) => {
  peerId = user.id;
  lobby.classList.add("hidden");
  chat.classList.remove("hidden");
  peerName.textContent = user.nick;
  messages.innerHTML = "";
});

// Wysyłanie wiadomości
$("#msgForm").onsubmit = (e) => {
  e.preventDefault();
  const input = $("#msgInput");
  const text = input.value.trim();
  if (!text) return;
  socket.emit("message", text);
  addMsg("Ja", text);
  input.value = "";
};

// Odbiór wiadomości
socket.on("message", (msg) => {
  addMsg("Rozmówca", msg.text);
});

// Zakończenie
$("#endBtn").onclick = () => socket.emit("end");
socket.on("ended", () => {
  chat.classList.add("hidden");
  lobby.classList.remove("hidden");
  peerId = null;
});

function addMsg(who, text) {
  const p = document.createElement("p");
  p.textContent = `${who}: ${text}`;
  messages.appendChild(p);
  messages.scrollTop = messages.scrollHeight;
}
