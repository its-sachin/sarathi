function showTab(city) {
  fetch(`data/${city}.csv`)
    .then(r => r.text())
    .then(t => {
      const rows = t.trim().split('\n').slice(1).map(l => l.split(','));
      document.getElementById('cityTabs').innerHTML =
        `<h2>${city}</h2><ul>` +
        rows.map(c => `<li>${c[0]} (${c[3]})</li>`).join('') +
        `</ul>`;
    });
}
showTab('Tokyo');