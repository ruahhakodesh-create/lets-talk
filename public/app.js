document.getElementById("joinForm").addEventListener("submit", function(e){
  e.preventDefault();

  const nickname = document.getElementById("nickname").value.trim();
  const purpose = document.getElementById("purpose").value;

  if(!nickname) return alert("Podaj pseudonim");

  // schowaj panel powitalny i formularz
  document.querySelector(".intro").classList.add("hidden");
  document.querySelector(".form").classList.add("hidden");

  // pokaż czat
  document.getElementById("chat").classList.remove("hidden");

  // komunikat powitalny
  const messages = document.getElementById("messages");
  const div = document.createElement("div");
  div.textContent = `Rozpoczynasz rozmowę jako "${nickname}" (cel: ${purpose}).`;
  div.style.fontStyle = "italic";
  messages.appendChild(div);
});

document.getElementById("chatForm").addEventListener("submit", function(e){
  e.preventDefault();
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  if(!text) return;

  const messages = document.getElementById("messages");
  const div = document.createElement("div");
  div.textContent = text;
  messages.appendChild(div);

  input.value = "";
  messages.scrollTop = messages.scrollHeight;
});
