import Chart from "chart.js/auto";

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

async function fetchWithAuth(url) {
  return fetch(url, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
}

async function loadData() {
  const username = document.getElementById('username').value;

  const repoRes = await fetchWithAuth(
    `https://api.github.com/users/${username}/repos?sort=updated&per_page=10`
  );
  const repos = await repoRes.json();

  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date();
  start.setMonth(end.getMonth() - 2);

  const labels = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    labels.push(d.toISOString().split('T')[0]);
  }

  const datasets = [];

  for (const repo of repos) {
    const url = `https://api.github.com/repos/${username}/${repo.name}/commits?since=${start.toISOString()}&until=${end.toISOString()}`;
    const commitsRes = await fetchWithAuth(url);

    if (commitsRes.status === 409) {
      console.warn(`Skipping empty repo: ${repo.name}`);
      continue; // skip empty repos
    }

    if (!commitsRes.ok) {
      console.warn(`Error fetching commits for ${repo.name}:`, commitsRes.status);
      continue;
    }

    const commits = await commitsRes.json();
    if (!Array.isArray(commits)) continue;

    const dailyCount = {};
    labels.forEach(date => dailyCount[date] = 0);
    commits.forEach(c => {
      const date = c.commit.author.date.split('T')[0];
      if (dailyCount[date] !== undefined) dailyCount[date]++;
    });

    datasets.push({
      label: repo.name,
      data: Object.values(dailyCount),
      fill: false,
      borderColor: '#' + Math.floor(Math.random() * 16777215).toString(16),
      tension: 0.3
    });
  }

  const ctx = document.getElementById('commitChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Commits' }, ticks: { stepSize: 2 }, suggestedMax: 30 },
        x: { title: { display: true, text: 'Date' } }
      }
    }
  });
}

document.getElementById('loadButton').addEventListener('click', loadData);
