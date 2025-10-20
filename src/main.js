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

    // Calculate 21-day threshold date
    const twentyOneDaysAgo = new Date();
    twentyOneDaysAgo.setDate(end.getDate() - 21);

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

    // Track repositories with no recent commits
    const inactiveRepos = [];

    for (let i = 0; i < repos.length; i++) {
      const repo = repos[i];
      let hasRecentCommits = false;
      let lastCommitDate = null;

      try {
        const commitsRes = await fetchWithAuth(
          `https://api.github.com/repos/${username}/${repo.name}/commits?since=${start.toISOString()}&until=${end.toISOString()}&per_page=100`
        );

        if (commitsRes.status === 409 || commitsRes.status === 404) {
          inactiveRepos.push({
            name: repo.name,
            reason: commitsRes.status === 409 ? 'Empty repository' : 'Repository not found',
            lastCommit: null
          });
          continue;
        }
        if (!commitsRes.ok) continue;

        const commits = await commitsRes.json();
        if (!Array.isArray(commits)) continue;

        // Initialize daily counts for this repo
        const repoDailyCount = new Array(labels.length).fill(0);

        // Track if repo has commits in last 21 days
        let hasCommitsInLast21Days = false;

        commits.forEach(c => {
          if (c.commit?.author?.date) {
            const date = c.commit.author.date.split('T')[0];
            const index = dateMap[date];
            if (index !== undefined) {
              repoDailyCount[index]++;

              // Check if this commit is within the last 21 days
              const commitDate = new Date(c.commit.author.date);
              if (commitDate >= twentyOneDaysAgo) {
                hasCommitsInLast21Days = true;
              }

              // Track last commit date
              if (!lastCommitDate || commitDate > lastCommitDate) {
                lastCommitDate = commitDate;
              }
            }
          }
        });

        const totalCommits = repoDailyCount.reduce((a, b) => a + b, 0);

        if (totalCommits === 0) {
          inactiveRepos.push({
            name: repo.name,
            reason: 'No commits in last 30 days',
            lastCommit: lastCommitDate
          });
          continue;
        }

        // Check if repo has been inactive for 21+ days
        if (!hasCommitsInLast21Days && lastCommitDate) {
          inactiveRepos.push({
            name: repo.name,
            reason: 'No commits in last 21 days',
            lastCommit: lastCommitDate
          });
        }

        // Create dataset for line chart
        datasets.push({
          label: repo.name,
          data: repoDailyCount,
          backgroundColor: colors[i % colors.length] + '20',
          borderColor: colors[i % colors.length],
          borderWidth: 2,
          pointBackgroundColor: colors[i % colors.length],
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.3,
        });

      } catch (error) {
        console.warn(`Error processing repo ${repo.name}:`, error);
        inactiveRepos.push({
          name: repo.name,
          reason: 'Error fetching data',
          lastCommit: null
        });
        continue;
      }
    }

    // Build the HTML content
    let htmlContent = '';

    if (datasets.length === 0) {
      htmlContent = `
        <div class="empty-state">
          <h3>No commit data found</h3>
          <p>No commit data available for repositories</p>
        </div>`;
    } else {
      htmlContent = `
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
        </div>`;
    }

    // Add inactive repositories section if there are any
    if (inactiveRepos.length > 0) {
      htmlContent += `
        <div class="inactive-repos">
          <h3>📊 Repository Activity Status</h3>
          <div class="inactive-repos-grid">
            ${inactiveRepos.map(repo => `
              <div class="repo-status-card ${getStatusClass(repo.reason)}">
                <div class="repo-status-header">
                  <span class="repo-name">${repo.name}</span>
                  <span class="status-indicator ${getStatusClass(repo.reason)}"></span>
                </div>
                <div class="repo-status-details">
                  <span class="status-reason">${repo.reason}</span>
                  ${repo.lastCommit ? `
                    <span class="last-commit">Last commit: ${formatDate(repo.lastCommit)}</span>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;
    }

    container.innerHTML = htmlContent;

    // Only create chart if we have datasets
    if (datasets.length > 0) {
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
              tension: 0.3
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
    }

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

// Helper functions
function getStatusClass(reason) {
  if (reason.includes('21 days')) return 'inactive';
  if (reason.includes('30 days')) return 'very-inactive';
  if (reason.includes('Empty') || reason.includes('not found')) return 'empty';
  return 'error';
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const loadButton = document.getElementById('loadButton');
  if (loadButton) loadButton.addEventListener('click', loadData);
  setTimeout(loadData, 1000);
});