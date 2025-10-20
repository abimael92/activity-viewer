import Chart from "chart.js/auto";

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

async function fetchWithAuth(url) {
  return fetch(url, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
}

async function loadData() {
  const username = document.getElementById('username').value;
  const container = document.getElementById('chartsContainer');

  // Clear previous charts
  container.innerHTML = '';

  const repoRes = await fetchWithAuth(
    `https://api.github.com/users/${username}/repos?sort=updated&per_page=10`
  );
  const repos = await repoRes.json();

  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date();
  start.setMonth(end.getMonth() - 2); // 6 months for better GitHub-like view

  // Generate labels for the last 6 months
  const labels = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    labels.push(d.toISOString().split('T')[0]);
  }

  for (const repo of repos) {
    // Create container for each repo
    const repoContainer = document.createElement('div');
    repoContainer.className = 'repo-chart-container';
    repoContainer.style.marginBottom = '40px';
    repoContainer.style.padding = '20px';
    repoContainer.style.border = '1px solid #e1e4e8';
    repoContainer.style.borderRadius = '6px';

    // Repo title
    const repoTitle = document.createElement('h3');
    repoTitle.innerHTML = `
      <a href="${repo.html_url}" target="_blank" style="color: #0969da; text-decoration: none;">
        ${repo.name}
      </a>
      <span style="color: #656d76; font-size: 14px; margin-left: 10px;">
        ${repo.stargazers_count} ★ ${repo.forks_count} 🍴
      </span>
    `;
    repoContainer.appendChild(repoTitle);

    // Description if available
    if (repo.description) {
      const repoDesc = document.createElement('p');
      repoDesc.textContent = repo.description;
      repoDesc.style.color = '#656d76';
      repoDesc.style.margin = '8px 0';
      repoContainer.appendChild(repoDesc);
    }

    // Canvas for chart
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 200;
    repoContainer.appendChild(canvas);

    container.appendChild(repoContainer);

    try {
      const url = `https://api.github.com/repos/${username}/${repo.name}/commits?since=${start.toISOString()}&until=${end.toISOString()}&per_page=100`;
      const commitsRes = await fetchWithAuth(url);

      if (commitsRes.status === 409 || commitsRes.status === 404) {
        console.warn(`Skipping repo: ${repo.name} - ${commitsRes.status}`);
        const noData = document.createElement('p');
        noData.textContent = 'No commit data available';
        noData.style.color = '#656d76';
        repoContainer.appendChild(noData);
        continue;
      }

      if (!commitsRes.ok) {
        console.warn(`Error fetching commits for ${repo.name}:`, commitsRes.status);
        continue;
      }

      const commits = await commitsRes.json();
      if (!Array.isArray(commits)) continue;

      // Process commit data
      const dailyCount = {};
      labels.forEach(date => dailyCount[date] = 0);

      commits.forEach(c => {
        if (c.commit && c.commit.author && c.commit.author.date) {
          const date = c.commit.author.date.split('T')[0];
          if (dailyCount[date] !== undefined) dailyCount[date]++;
        }
      });

      // GitHub-like color scheme based on commit intensity
      const getColor = (count) => {
        if (count === 0) return '#ebedf0';
        if (count < 3) return '#9be9a8';
        if (count < 6) return '#40c463';
        if (count < 10) return '#30a14e';
        return '#216e39';
      };

      // Create GitHub-like contribution graph (simplified line chart version)
      const ctx = canvas.getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels.filter((_, i) => i % 7 === 0), // Show weekly labels for clarity
          datasets: [{
            label: 'Commits',
            data: Object.values(dailyCount),
            fill: true,
            backgroundColor: 'rgba(9, 105, 218, 0.1)',
            borderColor: '#0969da',
            tension: 0.4,
            pointBackgroundColor: '#0969da',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                title: (context) => {
                  const date = new Date(labels[context[0].dataIndex]);
                  return date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Commits per day'
              },
              ticks: {
                stepSize: 1
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Timeline'
              },
              grid: {
                display: false
              },
              ticks: {
                maxTicksLimit: 10,
                callback: function (value, index) {
                  const date = new Date(this.getLabelForValue(value));
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }
              }
            }
          }
        }
      });

    } catch (error) {
      console.error(`Error processing repo ${repo.name}:`, error);
      const errorMsg = document.createElement('p');
      errorMsg.textContent = 'Error loading commit data';
      errorMsg.style.color = '#cf222e';
      repoContainer.appendChild(errorMsg);
    }
  }
}

document.getElementById('loadButton').addEventListener('click', loadData);