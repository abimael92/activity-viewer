# GitHub Repository Activity Visualizer

A powerful, professional-grade web application that provides comprehensive visualization of GitHub repository commit activity using interactive bar charts and advanced analytics.

## Features

### Advanced Data Visualization

* **Multi-Repository Bar Charts:** Compare commit activity across multiple repositories simultaneously
* **Interactive Legends:** Click to show/hide individual repositories for focused analysis
* **Professional Tooltips:** Detailed commit information with repository breakdowns and daily totals
* **Responsive Design:** Optimized for desktop, tablet, and mobile devices

### Deep Analytics

* **Daily Commit Tracking:** Monitor activity patterns over 30-day periods
* **Repository Comparison:** Visualize relative activity levels across projects
* **Aggregate Data Representation:** Proper bar chart visualization for discrete daily commit data
* **Real-time Data Fetching:** Live GitHub API integration with authentication

### Professional UI/UX

* **Dark/Light Theme Support:** Automatic theme detection with seamless switching
* **Smooth Animations:** Elegant transitions and loading states
* **Accessibility First:** Full keyboard navigation and screen reader support
* **Modern Design System:** Consistent spacing, typography, and color palette

## Why Bar Charts for Commit Data?

* Commit data is aggregate: Commits are discrete events measured per day, not continuous values
* Clear boundaries: Each bar represents exact daily totals without implying continuity
* Accurate comparisons: Easy visual comparison between repositories and across time periods
* Industry best practice: Following data visualization principles for aggregate metrics

## Technology Stack

* **Frontend:** Vanilla JavaScript ES6+
* **Charts:** Chart.js 4.4.0
* **Styling:** Modern CSS3
* **API:** GitHub REST API v3
* **Build:** Vite

## Installation & Setup

### Prerequisites

* Node.js 16+
* GitHub Personal Access Token
* Modern web browser

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/github-activity-visualizer.git
cd github-activity-visualizer
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
VITE_GITHUB_TOKEN=your_github_personal_access_token_here
```

### 3. Get GitHub Token

* Visit GitHub Settings > Developer settings > Personal access tokens
* Generate new token with `repo` and `read:user` permissions
* Copy token to your `.env` file

### 4. Install & Run

```bash
npm install
npm run dev
```

Visit `http://localhost:5173` to view the application.

## Usage Guide

### Basic Operation

* Enter GitHub Username
* Load Activity
* Analyze Data
* Interactive Filtering

### Advanced Features

* Repository Toggling
* Daily Breakdown
* Total Calculations
* Theme Adaptation

## Data Metrics

* **Repository Names**
* **Daily Commit Counts**
* **Activity Patterns**
* **Comparative Analysis**

## Visualization Features

* Color-Coded Repositories
* Grouped Bar Charts
* Interactive Elements
* Responsive Scaling

## Architecture

### Component Structure

```
src/
├── main.js
├── style.css
└── index.html
```

### Data Flow

* Input: GitHub username from UI
* API Calls: Fetch repository list → Fetch commit history for each repo
* Data Processing: Aggregate daily commits → Format for Chart.js
* Visualization: Render interactive bar chart → Apply user interactions
* UI Updates: Dynamic legend generation → Responsive chart updates

### Key Functions

* `loadData()`
* `fetchWithAuth()`
* Chart configuration
* Event handlers

## Customization

### Styling Modifications

```css
:root {
  --primary-gradient: linear-gradient(135deg, #646cff, #00d4aa);
  --card-bg: rgba(255, 255, 255, 0.05);
  --text-primary: #ffffff;
}
```

### Chart Configuration

```javascript
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false
}
```

### API Integration

* GET /users/{username}/repos
* GET /repos/{owner}/{repo}/commits
* Authenticated: 5,000 requests/hour
* Unauthenticated: 60 requests/hour

## Browser Support

* Chrome 90+
* Firefox 88+
* Safari 14+
* Edge 90+

## Performance Optimizations

* Efficient API Calls
* Chart.js Optimization
* CSS Optimization
* Memory Management

## Security Features

* Token Security
* Input Validation
* CORS Compliance
* XSS Protection

## Future Enhancements

* Extended Time Ranges
* Repository Filtering
* Export Capabilities
* Advanced Metrics
* Repository Insights
* GitHub Organizations & Enterprise support
* Slack/Discord notifications
* Automated reporting schedules

## Contributing

* Git clone & setup
* ESLint, Prettier, Semantic commits

## License

MIT License

## Acknowledgments

* Chart.js Team
* GitHub API
* Open Source Community

## Support

* Documentation
* Issues & Discussions
