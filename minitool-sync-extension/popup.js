function updateUI() {
  chrome.storage.local.get(["lastSync", "status"], (data) => {
    const statusEl = document.getElementById("status");
    if (data.status) {
      statusEl.textContent = data.status;
      if (data.status === "Success") statusEl.style.color = "#7ee787";
      else if (data.status === "Syncing...") statusEl.style.color = "#58a6ff";
      else statusEl.style.color = "#f85149";
    }
    if (data.lastSync) {
      document.getElementById("lastSync").textContent = new Date(data.lastSync).toLocaleTimeString();
    }
  });
}

document.getElementById("syncNow").addEventListener("click", () => {
  document.getElementById("status").textContent = "Syncing...";
  document.getElementById("status").style.color = "#58a6ff";
  chrome.runtime.sendMessage({ action: "syncNow" });
});

setInterval(updateUI, 1000);
updateUI();
