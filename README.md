📊 GitHub Activity Viewer
https://img.shields.io/badge/React-18-blue
https://img.shields.io/badge/TypeScript-Strict-blue
https://img.shields.io/badge/GitHub-API-green
https://img.shields.io/badge/Chart.js-4.0-orange

A comprehensive GitHub activity visualization dashboard that provides detailed insights into repository contributions, commit patterns, and development metrics.

🚀 Features
📈 Activity Analytics
Multi-timeframe Analysis - 7, 14, 30, 60, and 90-day views

Interactive Charts - Line charts with commit trends

Repository Statistics - Detailed metrics for each repository

Commit Patterns - Daily commit distribution and patterns

📊 Repository Insights
Total Commits - Overall contribution metrics

Max Commits Per Day - Peak productivity analysis

Consecutive Days - Development streak tracking

Last Activity - Recent contribution timestamps

Language Breakdown - Technology stack overview

🎯 Advanced Metrics
Inactivity Tracking - Identify dormant repositories

Yearly Overview - Full-year contribution analysis

Repository Filtering - Exclude specific repositories

Performance Analytics - Development habit insights

🛠️ Technology Stack
Frontend: React 18 with TypeScript

Charts: Chart.js with react-chartjs-2

API: GitHub REST API v3

Styling: CSS Modules with modern design

State Management: React Hooks (useState, useEffect)

Caching: Local storage for performance optimization

📁 Project Structure
text
src/
├── components/
│   ├── Charts.tsx           # Main chart visualization
│   ├── InactivitySections.tsx # Inactivity analysis
│   └── RepoStats.tsx        # Repository statistics
├── lib/
│   └── github.ts           # GitHub API utilities
├── types/
│   └── index.ts           # TypeScript definitions
└── app/
    └── page.tsx           # Main application component
🎨 Component Architecture
Main Application (page.tsx)
State Management: Username, time filters, chart data

Data Fetching: GitHub API integration with error handling

User Interface: Input controls and loading states

Data Processing: Commit aggregation and metric calculation

Charts Component
Multi-repository Visualization: Overlay multiple repository activities

Interactive Tooltips: Detailed commit information on hover

Responsive Design: Adapts to different screen sizes

Color-coded Repositories: Distinct colors for each repository

Repository Statistics
Metric Display: Total commits, streaks, peak activity

Sorting & Filtering: Organized repository listing

Progress Indicators: Visual representation of activity levels

Repository Metadata: Language, stars, forks information

🔧 Installation & Setup
Prerequisites
Node.js 16+

GitHub account

Personal Access Token (optional, for higher rate limits)

Environment Setup
bash
# Clone the repository
git clone <repository-url>
cd github-activity-viewer

# Install dependencies
npm install

# Start development server
npm run dev
GitHub API Configuration
typescript
// lib/github.ts
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Optional

export const fetchWithAuth = async (url: string) => {
  return fetch(url, {
    headers: {
      Authorization: GITHUB_TOKEN ? `token ${GITHUB_TOKEN}` : '',
      Accept: 'application/vnd.github.v3+json',
    },
  });
};
📊 API Integration
GitHub Endpoints Used
GET /users/{username} - User validation

GET /users/{username}/repos - Repository listing

GET /repos/{owner}/{repo}/commits - Commit history

Query parameters: since, until, per_page, page

Data Processing Pipeline
User Validation - Verify GitHub username exists

Repository Fetching - Get user's public repositories

Commit Aggregation - Paginate through commit history

Metric Calculation - Compute statistics and patterns

Chart Preparation - Format data for visualization

🎯 Key Features
Timeframe Analysis
typescript
const calculateTimeframe = (days: number) => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return { start, end };
};
Commit Metrics
Total Commits: Sum of all commits in timeframe

Max Daily Commits: Highest single-day contribution

Consecutive Days: Longest streak of daily commits

Last Activity: Most recent commit date

Repository Filtering
typescript
const ignoredRepos = [
  "ecommerce-fe", "college_project", "my_portfolio2", 
  "ecommerce_be", "postList", "my-portfolio"
];
📈 Visualization Features
Chart Configuration
Line Charts: Commit trends over time

Point Styling: Interactive data points

Area Fill: Visual commit volume representation

Color Scheme: Distinct repository identification

Responsive Design
Mobile-first: Optimized for all screen sizes

Loading States: User feedback during data fetching

Error Handling: Graceful error messages and recovery

🔄 Performance Optimizations
Caching Strategy
typescript
const cacheKey = `chart_${username}_${daysFilter}d`;
const cachedData = getCachedData<ChartData>(cacheKey);
if (cachedData) return cachedData;
Pagination Handling
Commit Pagination: Handle repositories with extensive history

Rate Limit Management: Respect GitHub API limits

Error Recovery: Continue processing after individual repo errors

🚀 Usage Examples
Basic Usage
Enter GitHub username

Select timeframe (7-90 days)

Click "Load Activity"

View interactive charts and statistics

Advanced Analysis
Compare multiple repository activities

Track development streaks and patterns

Identify inactive repositories

Analyze yearly contribution trends

🎨 Customization
Adding New Metrics
typescript
interface RepoStat {
  // Existing properties
  newMetric?: number;
}
Custom Color Schemes
typescript
const customColors = [
  '#your-color-1', '#your-color-2', '#your-color-3'
];
📱 Browser Support
Chrome/Chromium 90+

Firefox 88+

Safari 14+

Edge 90+

🤝 Contributing
Fork the repository

Create feature branch (git checkout -b feature/amazing-feature)

Commit changes (git commit -m 'Add amazing feature')

Push to branch (git push origin feature/amazing-feature)

Open Pull Request

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

🆘 Support
For support and questions:

Check the GitHub Issues for existing solutions

Create a new issue with detailed description

Provide relevant error messages and reproduction steps

Built for the developer community