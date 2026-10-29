self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Parking Update", {
      body: data.message || "Your parking status has changed.",
      icon: "/vite.svg",
  data: { slotId: data.slotId },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/find-my-car"));
});
