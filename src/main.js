import Chart from "chart.js/auto";

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

async function fetchWithAuth(url) {
  return fetch(url, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
}

async function loadData() {
  const username = document.getElementById('username').value;
  const container = document.getElementById('chartsContainer');

  // Show loading state
  container.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <p>Loading repository activity...</p>
        </div>
    `;

  try {
    const repoRes = await fetchWithAuth(
      `https://api.github.com/users/${username}/repos?sort=updated&per_page=10`
    );

    if (!repoRes.ok) {
      throw new Error(`Failed to fetch repositories: ${repoRes.status}`);
    }

    const repos = await repoRes.json();

    const end = new Date();
    end.setUTCHours(23, 59, 59, 999);
    const start = new Date();
    start.setMonth(end.getMonth() - 12); // 12 months for GitHub-style graph

    const labels = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      labels.push(d.toISOString().split('T')[0]);
    }

    const repoData = [];
    const colors = [
      '#216e39', '#30a14e', '#40c463', '#9be9a8', '#ebedf0',
      '#646cff', '#00d4aa', '#ff6b6b', '#ffa726', '#ab47bc'
    ];

    for (let i = 0; i < repos.length; i++) {
      const repo = repos[i];

      try {
        const commitsRes = await fetchWithAuth(
          `https://api.github.com/repos/${username}/${repo.name}/commits?since=${start.toISOString()}&until=${end.toISOString()}&per_page=100`
        );

        if (commitsRes.status === 409 || commitsRes.status === 404) {
          console.warn(`Skipping empty repo: ${repo.name}`);
          continue;
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
          if (c.commit && c.commit.author && c.commit.author.date) {
            const date = c.commit.author.date.split('T')[0];
            if (dailyCount[date] !== undefined) dailyCount[date]++;
          }
        });

        // Group by weeks (52 weeks)
        const weeklyData = [];
        for (let w = 0; w < 52; w++) {
          const weekStart = new Date(start);
          weekStart.setDate(weekStart.getDate() + w * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);

          let weekCommits = 0;
          for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            weekCommits += dailyCount[dateStr] || 0;
          }
          weeklyData.push(weekCommits);
        }

        repoData.push({
          name: repo.name,
          weeklyData: weeklyData,
          totalCommits: Object.values(dailyCount).reduce((a, b) => a + b, 0),
          color: colors[i % colors.length]
        });
      } catch (error) {
        console.warn(`Error processing repo ${repo.name}:`, error);
        continue;
      }
    }

    if (repoData.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <h3>No commit data found</h3>
                    <p>No commit data available for repositories</p>
                </div>
            `;
      return;
    }

    // Create single combined sparkline graph
    container.innerHTML = `
            <div class="combined-sparkline-container">
                <h2>Combined Repository Activity</h2>
                <div class="sparkline-legend">
                    ${repoData.map(repo => `
                        <div class="legend-item">
                            <span class="legend-color" style="background-color: ${repo.color}"></span>
                            <span class="legend-name">${repo.name}</span>
                            <span class="legend-commits">${repo.totalCommits} commits</span>
                        </div>
                    `).join('')}
                </div>
                <div class="combined-sparkline-wrapper">
                    <canvas id="combinedSparkline" width="800" height="120"></canvas>
                </div>
            </div>
        `;

    // Create the combined sparkline chart
    createCombinedSparkline(repoData);

  } catch (error) {
    console.error('Error loading data:', error);
    container.innerHTML = `
            <div class="empty-state">
                <h3>Error loading data</h3>
                <p>${error.message}</p>
                <p>Please check the username and try again.</p>
            </div>
        `;
  }
}

function createCombinedSparkline(repoData) {
  const canvas = document.getElementById('combinedSparkline');
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Calculate bar width
  const barWidth = width / 52;
  const maxCommits = Math.max(...repoData.flatMap(repo => repo.weeklyData));

  // Draw each repository's data
  repoData.forEach(repo => {
    const normalizedData = repo.weeklyData.map(val =>
      maxCommits > 0 ? (val / maxCommits) * height : 0
    );

    // Draw bars for this repository
    normalizedData.forEach((value, index) => {
      if (value > 0) {
        const x = index * barWidth;
        const barHeight = value;
        const y = height - barHeight;

        ctx.fillStyle = repo.color;
        ctx.fillRect(x, y, barWidth - 1, barHeight);
      }
    });
  });
}

// Load data automatically on page load
document.addEventListener('DOMContentLoaded', () => {
  const loadButton = document.getElementById('loadButton');
  if (loadButton) {
    loadButton.addEventListener('click', loadData);
  }
  // Auto-load for default user
  setTimeout(loadData, 1000);
});