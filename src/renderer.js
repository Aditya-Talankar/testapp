document.getElementById('btn').addEventListener('click', () => {
  document.getElementById('output').textContent =
    'Hello from platform: ' + window.api.platform;
});
