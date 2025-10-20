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
    start.setMonth(end.getMonth() - 2);

    const labels = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      labels.push(d.toISOString().split('T')[0]);
    }

    const datasets = [];
    const colors = [
      '#646cff', '#00d4aa', '#ff6b6b', '#ffa726', '#ab47bc',
      '#26c6da', '#d4e157', '#8d6e63', '#78909c', '#ec407a'
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

        datasets.push({
          label: repo.name,
          data: Object.values(dailyCount),
          fill: false,
          borderColor: colors[i % colors.length],
          backgroundColor: colors[i % colors.length] + '20',
          tension: 0.4,
          borderWidth: 2,
          pointBackgroundColor: colors[i % colors.length],
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        });
      } catch (error) {
        console.warn(`Error processing repo ${repo.name}:`, error);
        continue;
      }
    }

    if (datasets.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <h3>No commit data found</h3>
                    <p>No commit data available for repositories</p>
                </div>
            `;
      return;
    }

    // Create chart container
    container.innerHTML = `
            <div class="chart-container">
                <h2>Repository Commit Activity</h2>
                <div class="chart-wrapper">
                    <canvas id="commitChart"></canvas>
                </div>
            </div>
        `;

    const ctx = document.getElementById('commitChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.filter((_, i) => i % 7 === 0), // Show weekly labels
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: 'rgba(255, 255, 255, 0.8)',
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.2)'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Commits per day',
              color: 'rgba(255, 255, 255, 0.7)'
            },
            ticks: {
              stepSize: 1,
              color: 'rgba(255, 255, 255, 0.7)'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Date',
              color: 'rgba(255, 255, 255, 0.7)'
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)',
              maxTicksLimit: 8,
              callback: function (value, index) {
                const date = new Date(this.getLabelForValue(value));
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                });
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });

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

// Load data automatically on page load
document.addEventListener('DOMContentLoaded', () => {
  const loadButton = document.getElementById('loadButton');
  if (loadButton) {
    loadButton.addEventListener('click', loadData);
  }
  // Auto-load for default user
  setTimeout(loadData, 1000);
});