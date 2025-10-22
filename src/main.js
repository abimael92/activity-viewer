import Chart from "chart.js/auto";

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// Enhanced fetch function with better rate limit handling
async function fetchWithAuth(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GitHub-Commit-Visualizer',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    // Enhanced rate limiting with better messaging
    if (response.status === 403) {
      const remaining = response.headers.get('X-RateLimit-Remaining');
      const resetTime = response.headers.get('X-RateLimit-Reset');

      if (remaining === '0') {
        const resetDate = new Date(resetTime * 1000);
        const now = new Date();
        const minutesUntilReset = Math.ceil((resetDate - now) / (1000 * 60));

        throw new Error(`GitHub API rate limit exceeded. Resets in ${minutesUntilReset} minutes (${resetDate.toLocaleTimeString()})`);
      }
    }

    if (response.status === 404) {
      throw new Error('User or repository not found');
    }

    if (response.status === 429) {
      throw new Error('Too many requests. Please wait a moment before trying again.');
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

// Caching functions
function getCachedData(key) {
  try {
    const cached = localStorage.getItem(`gh_${key}`);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(`gh_${key}`);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function setCachedData(key, data) {
  try {
    localStorage.setItem(`gh_${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('Could not cache data:', error);
  }
}

// Main data loading function
async function loadData() {
  const username = document.getElementById('username').value.trim();
  const daysFilter = document.getElementById('daysFilter').value;
  const container = document.getElementById('chartsContainer');

  // Add loading state prevention for rapid clicks
  if (container.classList.contains('loading')) {
    return;
  }

  // Validate username
  if (!username) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Please enter a GitHub username</h3>
        <p>Enter a valid GitHub username to view commit activity.</p>
      </div>`;
    return;
  }

  // Add loading state
  container.classList.add('loading');
  container.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>Loading repository activity for ${username}...</p>
      <small>This may take a moment depending on the number of repositories.</small>
    </div>
  `;

  try {
    // Add delay between requests to be respectful to GitHub API
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    // Check cache first
    const cacheKey = `${username}_${daysFilter}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      renderData(cachedData, username, daysFilter);
      container.classList.remove('loading');
      return;
    }

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
      container.classList.remove('loading');
      return;
    }

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - parseInt(daysFilter));

    // Calculate 21-day threshold date
    const twentyOneDaysAgo = new Date();
    twentyOneDaysAgo.setDate(end.getDate() - 21);

    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(end.getDate() - 15);

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
    const repos15Days = [];   // 15-20 days inactive
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
        let hasCommitsInLast15Days = false;

        commits.forEach(c => {
          if (c.commit?.author?.date) {

            // Get commit timestamp
            const commitDateUTC = new Date(c.commit.author.date);

            // Convert to local date (midnight of that day)
            const localDate = new Date(commitDateUTC.getFullYear(), commitDateUTC.getMonth(), commitDateUTC.getDate());

            // Format as yyyy-mm-dd for dateMap lookup
            const dateStr = localDate.toISOString().split('T')[0];

            const index = dateMap[dateStr];
            if (index !== undefined) {
              repoDailyCount[index]++;
              totalCommits++;

              // Track max commits day
              if (repoDailyCount[index] > maxCommits) {
                maxCommits = repoDailyCount[index];
                maxCommitsDate = dateStr;
              }

              // Check if this commit is within the last 21 days
              const commitDate = new Date(c.commit.author.date);
              if (commitDate >= twentyOneDaysAgo) {
                hasCommitsInLast21Days = true;
              }

              if (commitDate >= fifteenDaysAgo) {
                hasCommitsInLast15Days = true;
              }

              // Track last commit date
              if (!lastCommitDate || commitDate > lastCommitDate) {
                lastCommitDate = commitDate;
              }
            }
          }
        });

        // Calculate consecutive commit days
        let currentStreak = 0;
        let maxConsecutiveDays = 0;
        for (let count of repoDailyCount) {
          if (count > 0) {
            currentStreak++;
            maxConsecutiveDays = Math.max(maxConsecutiveDays, currentStreak);
          } else {
            currentStreak = 0;
          }
        }

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
            color: colors[i % colors.length],
            createdAt: repo.created_at,
            maxConsecutiveDays: maxConsecutiveDays,
            description: repo.description
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
        }
        // Check if repo has been inactive for 15-20 days (but has commits in last 21 days)
        else if (!hasCommitsInLast15Days && hasCommitsInLast21Days && lastCommitDate) {
          repos15Days.push({
            name: repo.name,
            reason: 'No commits in last 15 days (but active in last 21 days)',
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

        // Add delay between repository requests to avoid rate limiting
        await delay(500);

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

    // Prepare data for caching and rendering
    const dataToCache = {
      datasets,
      repoStats,
      inactiveRepos,
      repos15Days,
      labels,
      fullDates
    };

    // Cache the results
    setCachedData(cacheKey, dataToCache);

    // Render the data
    renderData(dataToCache, username, daysFilter);

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
  } finally {
    container.classList.remove('loading');
  }
}

// Separate rendering function
function renderData(data, username, daysFilter) {
  const { datasets, repoStats, inactiveRepos, repos15Days, labels, fullDates } = data;
  const container = document.getElementById('chartsContainer');

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
        <div class="section-header">
          <h3>Repository Insights</h3>
          <div class="stats-summary">
            <span class="summary-item">
              <span class="summary-count">${repoStats.length}</span>
              <span class="summary-label">Active Repos</span>
            </span>
            <span class="summary-item">
              <span class="summary-count">${repoStats.reduce((sum, stat) => sum + stat.totalCommits, 0)}</span>
              <span class="summary-label">Total Commits</span>
            </span>
          </div>
        </div>

        <div class="stats-controls">
          <div class="view-toggle">
            <button class="view-btn active" data-view="grid">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="1" width="4" height="4" rx="1"/>
                <rect x="1" y="7" width="4" height="4" rx="1"/>
                <rect x="7" y="1" width="4" height="4" rx="1"/>
                <rect x="7" y="7" width="4" height="4" rx="1"/>
                <rect x="13" y="1" width="2" height="4" rx="1"/>
                <rect x="13" y="7" width="2" height="4" rx="1"/>
              </svg>
              Grid
            </button>
            <button class="view-btn" data-view="list">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="1" width="14" height="2" rx="1"/>
                <rect x="1" y="7" width="14" height="2" rx="1"/>
                <rect x="1" y="13" width="14" height="2" rx="1"/>
              </svg>
              List
            </button>
          </div>
          <div class="sort-controls">
            <select class="sort-select">
              <option value="name">Sort by Name</option>
              <option value="commits">Sort by Commits</option>
              <option value="recent">Sort by Recent</option>
              <option value="streak">Sort by Streak</option>
            </select>
          </div>
        </div>

        <div class="stats-grid" id="statsContainer">
          ${repoStats.map((stat, index) => `
            <div class="stat-card" data-repo="${stat.name.toLowerCase()}" data-commits="${stat.totalCommits}" data-streak="${stat.maxConsecutiveDays}">
              <div class="card-header">
                <div class="repo-main-info">
                  <div class="repo-avatar" style="background: linear-gradient(135deg, ${stat.color}20, ${stat.color}40); border-color: ${stat.color}">
                    <span style="color: ${stat.color}">${getRepoInitials(stat.name)}</span>
                  </div>
                  <div class="repo-title">
                    <h4 class="repo-name" style="color: ${stat.color}">${stat.name}</h4>
                    <div class="repo-meta">
                      <span class="repo-age" data-tooltip="Repository age">
                        ${getRepositoryAge(stat.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="repo-actions">
                  <button class="action-btn favorite-btn" data-tooltip="Add to favorites">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 1.5l2.5 5 5.5.5-4 4 1 5.5-5-3-5 3 1-5.5-4-4 5.5-.5z"/>
                    </svg>
                  </button>
                  <button class="action-btn expand-btn" data-tooltip="Show details">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M4 6l4 4 4-4z"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div class="card-stats">
                <div class="stat-pill primary">
                  <span class="stat-value">${stat.totalCommits}</span>
                  <span class="stat-label">Total</span>
                </div>
                <div class="stat-pill ${stat.maxCommits >= 5 ? 'highlight' : 'secondary'}">
                  <span class="stat-value">${stat.maxCommits}</span>
                  <span class="stat-label">Peak</span>
                </div>
                <div class="stat-pill ${stat.maxConsecutiveDays >= 7 ? 'success' : 'secondary'}">
                  <span class="stat-value">${stat.maxConsecutiveDays}</span>
                  <span class="stat-label">Streak</span>
                </div>
              </div>

              <div class="card-details">
                <div class="detail-item">
                  <div class="detail-content">
                    <span class="detail-label">Peak Activity</span>
                    <span class="detail-value">${formatDate(stat.maxCommitsDate)}</span>
                  </div>
                </div>

                <div class="detail-item">
                  <div class="detail-content">
                    <span class="detail-label">Best Streak</span>
                    <span class="detail-value">${stat.maxConsecutiveDays} consecutive days</span>
                  </div>
                </div>

                ${stat.description ? `
                <div class="detail-item description">
                  <div class="detail-content">
                    <span class="detail-label">Description</span>
                    <span class="detail-value">${stat.description}</span>
                  </div>
                </div>
                ` : ''}

                <div class="activity-meter">
                  <div class="meter-label">Activity Level</div>
                  <div class="meter-bar">
                    <div class="meter-fill ${getActivityLevel(stat.totalCommits, stat.maxConsecutiveDays)}" 
                         style="width: ${Math.min((stat.totalCommits / 50) * 100, 100)}%">
                      <span class="meter-text">${getActivityLevel(stat.totalCommits, stat.maxConsecutiveDays)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="card-footer">
                <div class="commit-trend">
                  <span class="trend-label">Recent Activity</span>
                  <div class="trend-sparkline">
                    ${generateSparkline([])}
                  </div>
                </div>
                <button class="view-repo-btn" onclick="window.open('https://github.com/${username}/${stat.name}', '_blank')">
                  View Repo
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M10 2h4v4l-1-1-3 3-1-1 3-3-1-1zM6 10L3 7l1-1 3 3-1 1z"/>
                  </svg>
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="stats-footer">
          <div class="export-controls">
            <button class="export-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1v8m0 0l2-2m-2 2L6 7m6 4v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3"/>
              </svg>
              Export Data
            </button>
          </div>
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

  // container.innerHTML = htmlContent;

  // Add 15-day inactive repositories section if there are any
  if (repos15Days.length > 0) {
    // Sort by days without commits (descending)
    repos15Days.sort((a, b) => {
      if (a.daysWithoutCommits === 'N/A') return 1;
      if (b.daysWithoutCommits === 'N/A') return -1;
      return b.daysWithoutCommits - a.daysWithoutCommits;
    });

    htmlContent += `
  <div class="inactive-repos">
    <h3>Recently Inactive Repositories (15+ Days)</h3>
    <p class="section-subtitle">Repositories with no commits in the last 15 days but had activity in the last 21 days</p>
    <div class="inactive-repos-grid">
      ${repos15Days.map(repo => `
        <div class="repo-status-card warning">
          <div class="repo-status-header">
            <span class="repo-name">${repo.name}</span>
            <div class="status-info">
              ${repo.daysWithoutCommits !== 'N/A' ? `
                <span class="days-counter warning">
                  ${repo.daysWithoutCommits} day${repo.daysWithoutCommits !== 1 ? 's' : ''}
                </span>
              ` : ''}
              <span class="status-indicator warning"></span>
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

  // Set the HTML content only ONCE at the end
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
                const date = new Date(fullDates[index] + 'T00:00:00');
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
                const date = new Date(fullDates[context.dataIndex] + 'T00:00:00');
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
}

// Helper functions
function getStatusClass(reason) {
  if (reason.includes('15 days')) return 'warning';
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

function getRepoInitials(repoName) {
  if (!repoName) return '??';

  // Handle camelCase, kebab-case, snake_case
  const words = repoName
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(word => word.length > 0);

  // Take first 2-3 characters from the first word, or first letter of first two words
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  } else {
    return repoName.substring(0, 2).toUpperCase();
  }
}

function getRepositoryAge(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 30) return `${diffDays} days`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
  return `${Math.floor(diffDays / 365)} years`;
}

function getActivityLevel(totalCommits, streak) {
  const score = totalCommits + (streak * 2);
  if (score > 50) return 'very-high';
  if (score > 25) return 'high';
  if (score > 10) return 'medium';
  return 'low';
}

function generateSparkline(activity) {
  // Simple sparkline generation - you can enhance this with real data
  const values = activity.length > 0 ? activity : [1, 3, 2, 5, 4, 3, 6];
  const max = Math.max(...values);
  return values.map(val =>
    `<div class="sparkline-bar" style="height: ${(val / max) * 100}%"></div>`
  ).join('');
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

// Remove the auto-load on timeout to prevent rate limiting
// setTimeout(loadData, 1000);