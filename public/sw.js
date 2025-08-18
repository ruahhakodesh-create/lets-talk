self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => self.clients.claim());
// Na razie bez cache; tylko po to, by PWA dawało „Zainstaluj”
