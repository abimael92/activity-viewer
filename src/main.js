import Chart from "chart.js/auto";

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

async function fetchWithAuth(url) {
  return fetch(url, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
}

async function loadData() {
  const username = document.getElementById('username').value;
  const container = document.getElementById('chartsContainer');

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

    if (!repoRes.ok) throw new Error(`Failed to fetch repositories: ${repoRes.status}`);
    const repos = await repoRes.json();

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);

    // Generate daily labels
    const labels = [];
    const dateMap = {};
    let currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const label = currentDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      labels.push(label);
      dateMap[dateStr] = labels.length - 1;
      currentDate.setDate(currentDate.getDate() + 1);
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

        if (commitsRes.status === 409 || commitsRes.status === 404) continue;
        if (!commitsRes.ok) continue;

        const commits = await commitsRes.json();
        if (!Array.isArray(commits)) continue;

        // Initialize daily counts for this repo
        const repoDailyCount = new Array(labels.length).fill(0);

        commits.forEach(c => {
          if (c.commit?.author?.date) {
            const date = c.commit.author.date.split('T')[0];
            const index = dateMap[date];
            if (index !== undefined) {
              repoDailyCount[index]++;
            }
          }
        });

        const totalCommits = repoDailyCount.reduce((a, b) => a + b, 0);
        if (totalCommits === 0) continue;

        // Create dataset for line chart
        datasets.push({
          label: repo.name,
          data: repoDailyCount,
          backgroundColor: colors[i % colors.length] + '20', // Add transparency for fill
          borderColor: colors[i % colors.length],
          borderWidth: 2,
          pointBackgroundColor: colors[i % colors.length],
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.3, // Smooth curves
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
        </div>`;
      return;
    }

    // Create line chart
    container.innerHTML = `
      <div class="chart-container">
        <h2>Daily Commit Activity (Last 30 Days)</h2>
        <p class="chart-subtitle">Click legend items to toggle repositories | Line charts show activity trends over time</p>
        <div class="chart-wrapper">
          <canvas id="commitChart"></canvas>
        </div>
        <div class="chart-legend" id="chartLegend">
          ${datasets.map((dataset, index) => `
            <div class="legend-item active" data-index="${index}">
              <span class="legend-color" style="background-color: ${dataset.borderColor}"></span>
              <span class="legend-name">${dataset.label}</span>
              <span class="legend-toggle">✓</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const ctx = document.getElementById('commitChart').getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            cornerRadius: 6,
            displayColors: true,
            callbacks: {
              title: (tooltipItems) => {
                return tooltipItems[0].label;
              },
              label: (context) => {
                return `${context.dataset.label}: ${context.parsed.y} commit${context.parsed.y !== 1 ? 's' : ''}`;
              },
              afterBody: (tooltipItems) => {
                const total = tooltipItems.reduce((sum, item) => sum + item.parsed.y, 0);
                return `Total: ${total} commit${total !== 1 ? 's' : ''}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Commits per Day',
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
              maxTicksLimit: 15,
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
        },
        elements: {
          line: {
            tension: 0.3 // Smooth lines
          }
        }
      }
    });

    // Add legend click handler after chart creation
    document.getElementById('chartLegend').addEventListener('click', (e) => {
      const legendItem = e.target.closest('.legend-item');
      if (!legendItem) return;

      const datasetIndex = parseInt(legendItem.dataset.index);
      const meta = chart.getDatasetMeta(datasetIndex);

      // Toggle visibility
      meta.hidden = !meta.hidden;
      legendItem.classList.toggle('inactive');
      legendItem.querySelector('.legend-toggle').textContent = meta.hidden ? '✕' : '✓';

      chart.update();
    });

  } catch (error) {
    console.error('Error loading data:', error);
    container.innerHTML = `
      <div class="empty-state">
        <h3>Error loading data</h3>
        <p>${error.message}</p>
        <p>Please check the username and try again.</p>
      </div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const loadButton = document.getElementById('loadButton');
  if (loadButton) loadButton.addEventListener('click', loadData);
  setTimeout(loadData, 1000);
});