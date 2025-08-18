const socket = io();
let peerId = null;

document.getElementById("joinForm").onsubmit = (e) => {
  e.preventDefault();
  const form = e.target;
  const data = {
    nick: form.nick.value,
    age: form.age.value,
    country: form.country.value
  };
  socket.emit("join", data);
  document.getElementById("entry").classList.add("hidden");
  document.getElementById("lobby").classList.remove("hidden");
};

socket.on("users", (users) => {
  const list = document.getElementById("userList");
  list.innerHTML = "";
  users.forEach(u => {
    if (u.id !== socket.id) {
      const li = document.createElement("li");
      li.textContent = `${u.nick} (${u.age}, ${u.country})`;
      li.onclick = () => socket.emit("invite", u.id);
      list.appendChild(li);
    }
  });
});

socket.on("invited", (user) => {
  if (confirm(`Rozmowa z ${user.nick}?`)) {
    socket.emit("accept", user.id);
    startChat(user);
  }
});

socket.on("accepted", (user) => {
  startChat(user);
});

function startChat(user) {
  peerId = user.id;
  document.getElementById("lobby").classList.add("hidden");
  document.getElementById("chat").classList.remove("hidden");
  document.getElementById("peerName").textContent = user.nick;
}

document.getElementById("msgForm").onsubmit = (e) => {
  e.preventDefault();
  const input = document.getElementById("msgInput");
  socket.emit("message", { to: peerId, text: input.value });
  addMessage("Ja", input.value);
  input.value = "";
};

socket.on("message", (msg) => {
  addMessage("On/ona", msg.text);
});

function addMessage(who, text) {
  const div = document.getElementById("messages");
  const p = document.createElement("p");
  p.textContent = `${who}: ${text}`;
  div.appendChild(p);
  div.scrollTop = div.scrollHeight;
}
