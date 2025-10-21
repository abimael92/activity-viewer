import Chart from "chart.js/auto";

async function fetchWithAuth(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GitHub-Commit-Visualizer',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    // Handle rate limiting
    if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
      const resetTime = response.headers.get('X-RateLimit-Reset');
      const resetDate = new Date(resetTime * 1000);
      throw new Error(`GitHub API rate limit exceeded. Resets at: ${resetDate.toLocaleTimeString()}`);
    }

    if (response.status === 404) {
      throw new Error('User or repository not found');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Please check your internet connection');
    }
    throw error;
  }
}

async function loadData() {
  const username = document.getElementById('username').value.trim();
  const daysFilter = document.getElementById('daysFilter').value;
  const container = document.getElementById('chartsContainer');

  // Validate username
  if (!username) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Please enter a GitHub username</h3>
        <p>Enter a valid GitHub username to view commit activity.</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>Loading repository activity for ${username}...</p>
    </div>
  `;

  try {
    // Test user existence first
    const userRes = await fetchWithAuth(
      `https://api.github.com/users/${username}`
    );

    if (!userRes.ok) {
      throw new Error(`User "${username}" not found on GitHub`);
    }

    const repoRes = await fetchWithAuth(
      `https://api.github.com/users/${username}/repos?sort=updated&per_page=10`
    );

    if (!repoRes.ok) {
      const errorData = await repoRes.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch repositories: ${repoRes.status}`);
    }

    const repos = await repoRes.json();

    // Check if user has repositories
    if (repos.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No repositories found</h3>
          <p>User "${username}" doesn't have any public repositories.</p>
        </div>`;
      return;
    }

    // Rest of your existing code continues here...
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - parseInt(daysFilter));

    // Calculate 21-day threshold date
    const twentyOneDaysAgo = new Date();
    twentyOneDaysAgo.setDate(end.getDate() - 21);

    // Generate daily labels and full dates
    const labels = [];
    const fullDates = [];
    const dateMap = {};
    let currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const label = currentDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        weekday: 'short'
      });
      labels.push(label);
      fullDates.push(dateStr);
      dateMap[dateStr] = labels.length - 1;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const datasets = [];
    const colors = [
      '#646cff', '#00d4aa', '#ff6b6b', '#ffa726', '#ab47bc',
      '#26c6da', '#d4e157', '#8d6e63', '#78909c', '#ec407a'
    ];

    // Track repositories with no recent commits and their inactivity periods
    const inactiveRepos = [];
    // Track repository statistics
    const repoStats = [];

    for (let i = 0; i < repos.length; i++) {
      const repo = repos[i];
      let lastCommitDate = null;

      // Initialize tracking variables for each repo
      let maxCommits = 0;
      let maxCommitsDate = null;
      let totalCommits = 0;

      try {
        console.log(`Fetching commits for: ${repo.name}`);

        const commitsRes = await fetchWithAuth(
          `https://api.github.com/repos/${username}/${repo.name}/commits?since=${start.toISOString()}&until=${end.toISOString()}&per_page=100`
        );

        if (commitsRes.status === 409 || commitsRes.status === 404) {
          inactiveRepos.push({
            name: repo.name,
            reason: commitsRes.status === 409 ? 'Empty repository' : 'Repository not found',
            lastCommit: null,
            daysWithoutCommits: 'N/A'
          });
          continue;
        }

        if (!commitsRes.ok) {
          console.warn(`Skipping repo ${repo.name}, status: ${commitsRes.status}`);
          continue;
        }

        const commits = await commitsRes.json();
        if (!Array.isArray(commits)) {
          console.warn(`No commits array for ${repo.name}`);
          continue;
        }

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
              totalCommits++;

              // Track max commits day
              if (repoDailyCount[index] > maxCommits) {
                maxCommits = repoDailyCount[index];
                maxCommitsDate = date;
              }

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

        // Calculate days without commits
        let daysWithoutCommits = 0;
        if (lastCommitDate) {
          const lastCommit = new Date(lastCommitDate);
          const todayObj = new Date();
          daysWithoutCommits = Math.floor((todayObj - lastCommit) / (1000 * 60 * 60 * 24));
        }

        if (totalCommits === 0) {
          inactiveRepos.push({
            name: repo.name,
            reason: 'No commits in selected period',
            lastCommit: lastCommitDate,
            daysWithoutCommits: daysWithoutCommits
          });
          continue;
        }

        // Add to repo stats
        if (totalCommits > 0) {
          repoStats.push({
            name: repo.name,
            maxCommits: maxCommits,
            maxCommitsDate: maxCommitsDate,
            totalCommits: totalCommits,
            color: colors[i % colors.length]
          });
        }

        // Check if repo has been inactive for 21+ days
        if (!hasCommitsInLast21Days && lastCommitDate) {
          inactiveRepos.push({
            name: repo.name,
            reason: 'No commits in last 21 days',
            lastCommit: lastCommitDate,
            daysWithoutCommits: daysWithoutCommits
          });
        } else {
          // Create dataset for line chart only for active repos
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
        }

      } catch (error) {
        console.warn(`Error processing repo ${repo.name}:`, error);
        inactiveRepos.push({
          name: repo.name,
          reason: 'Error fetching data: ' + error.message,
          lastCommit: null,
          daysWithoutCommits: 'N/A'
        });
        continue;
      }
    }

    // Build the HTML content
    let htmlContent = '';

    if (datasets.length === 0) {
      htmlContent = `
        <div class="empty-state">
          <h3>No commit activity found</h3>
          <p>No commit data available for ${username}'s repositories in the last ${daysFilter} days.</p>
          ${inactiveRepos.length > 0 ? `<p>Found ${inactiveRepos.length} repositories with no recent activity.</p>` : ''}
        </div>`;
    } else {
      htmlContent = `
        <div class="chart-container">
          <h2>${username}'s Daily Commit Activity (Last ${daysFilter} Days)</h2>
          <p class="chart-subtitle">Click legend items to toggle repositories</p>
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

    // Add repo stats section
    if (repoStats.length > 0) {
      htmlContent += `
        <div class="repo-stats">
          <h3>Repository Statistics</h3>
          <div class="stats-grid">
            ${repoStats.map(stat => `
              <div class="stat-card">
                <div class="repo-stat-header">
                  <span class="repo-name" style="color: ${stat.color}">${stat.name}</span>
                  <span class="max-commits-badge">${stat.maxCommits} commits</span>
                </div>
                <div class="stat-details">
                  <span class="peak-day">Peak: ${formatDate(stat.maxCommitsDate)}</span>
                  <span class="total-commits">Total: ${stat.totalCommits} commits</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;
    }

    // Add inactive repositories section if there are any
    if (inactiveRepos.length > 0) {
      // Sort by days without commits (descending)
      inactiveRepos.sort((a, b) => {
        if (a.daysWithoutCommits === 'N/A') return 1;
        if (b.daysWithoutCommits === 'N/A') return -1;
        return b.daysWithoutCommits - a.daysWithoutCommits;
      });

      htmlContent += `
        <div class="inactive-repos">
          <h3>Inactive Repositories</h3>
          <div class="inactive-repos-grid">
            ${inactiveRepos.map(repo => `
              <div class="repo-status-card ${getStatusClass(repo.reason)}">
                <div class="repo-status-header">
                  <span class="repo-name">${repo.name}</span>
                  <div class="status-info">
                    ${repo.daysWithoutCommits !== 'N/A' ? `
                      <span class="days-counter ${getDaysCounterClass(repo.daysWithoutCommits)}">
                        ${repo.daysWithoutCommits} day${repo.daysWithoutCommits !== 1 ? 's' : ''}
                      </span>
                    ` : ''}
                    <span class="status-indicator ${getStatusClass(repo.reason)}"></span>
                  </div>
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
                  const index = tooltipItems[0].dataIndex;
                  const date = new Date(fullDates[index]);
                  return date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                },
                label: (context) => {
                  const value = context.parsed.y;
                  if (value === 0) {
                    return null;
                  }
                  return `${context.dataset.label}: ${value} commit${value !== 1 ? 's' : ''}`;
                },
                afterBody: (tooltipItems) => {
                  const total = tooltipItems.reduce((sum, item) => sum + item.parsed.y, 0);
                  if (total === 0) {
                    return 'No commits on this day';
                  }
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
                maxTicksLimit: 5,
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
      const chartLegend = document.getElementById('chartLegend');
      if (chartLegend) {
        chartLegend.addEventListener('click', (e) => {
          const legendItem = e.target.closest('.legend-item');
          if (!legendItem) return;

          const datasetIndex = parseInt(legendItem.dataset.index);
          const meta = chart.getDatasetMeta(datasetIndex);

          // Toggle visibility
          meta.hidden = !meta.hidden;
          legendItem.classList.toggle('inactive');
          const toggle = legendItem.querySelector('.legend-toggle');
          if (toggle) {
            toggle.textContent = meta.hidden ? '✕' : '✓';
          }

          chart.update();
        });
      }
    }

  } catch (error) {
    console.error('Error loading data:', error);
    container.innerHTML = `
      <div class="empty-state">
        <h3>Error loading data</h3>
        <p>${error.message}</p>
        <p>Please check the username and try again.</p>
        <details style="margin-top: 1rem; text-align: left;">
          <summary>Technical Details</summary>
          <small>Error: ${error.message}<br>
          This could be due to: GitHub API limits, network issues, or invalid username.</small>
        </details>
      </div>`;
  }
}

// Helper functions
function getStatusClass(reason) {
  if (reason.includes('21 days')) return 'inactive';
  if (reason.includes('Empty') || reason.includes('not found')) return 'empty';
  if (reason.includes('Error')) return 'error';
  return 'very-inactive';
}

function getDaysCounterClass(days) {
  if (days <= 7) return 'recent';
  if (days <= 21) return 'moderate';
  if (days <= 60) return 'inactive';
  return 'very-inactive';
}

function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const loadButton = document.getElementById('loadButton');
  const usernameInput = document.getElementById('username');

  if (loadButton) {
    loadButton.addEventListener('click', loadData);
  }

  if (usernameInput) {
    usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        loadData();
      }
    });
  }
});
setTimeout(loadData, 1000);