import React from 'react';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-main">
                    {/* Brand & Description */}
                    <div className="footer-brand">
                        <div className="brand-header">
                            <span className="brand-icon"></span>
                            <h3 className="brand-title">GitHub Activity Viewer</h3>
                        </div>
                        <p className="brand-description">
                            Professional-grade GitHub analytics for tracking development activity,
                            commit patterns, and repository insights. Built for engineering teams.
                        </p>
                    </div>

                    {/* Links & Tech Stack */}
                    <div className="footer-links">
                        <div className="link-group">
                            <h4 className="link-group-title">Product</h4>
                            <ul className="link-list">
                                <li className="link-item">
                                    <a href="#">Features</a>
                                </li>
                                <li className="link-item">
                                    <a href="#">API Documentation</a>
                                </li>
                                <li className="link-item">
                                    <a href="#">Changelog</a>
                                </li>
                            </ul>
                        </div>

                        <div className="link-group">
                            <h4 className="link-group-title">Developers</h4>
                            <ul className="link-list">
                                <li className="link-item">
                                    <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                                        GitHub
                                    </a>
                                </li>
                                <li className="link-item">
                                    <a href="#">Contributing</a>
                                </li>
                                <li className="link-item">
                                    <a href="#">Issues</a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Tech Stack */}
                <div className="tech-stack">
                    <span className="tech-badge">React 18</span>
                    <span className="tech-badge">TypeScript</span>
                    <span className="tech-badge">GitHub REST API</span>
                    <span className="tech-badge">Chart.js 4.0</span>
                    <span className="tech-badge">Next.js 14</span>
                </div>

                {/* Bottom Section */}
                <div className="footer-bottom">
                    <div className="copyright">
                        © {currentYear} GitHub Activity Viewer. All rights reserved.
                    </div>

                    <div className="legal-links">
                        <a href="#">Privacy Policy</a>
                        <span className="legal-divider">•</span>
                        <a href="#">Terms of Service</a>
                        <span className="legal-divider">•</span>
                        <a href="#">Cookie Policy</a>
                    </div>

                    <div className="built-with">
                        <span>Built for engineers</span>
                        <span className="heart-icon">&lt;/dev&gt;</span>
                    </div>
                </div>

                {/* API Attribution */}
                <div className="api-notice">
                    <p>
                        This tool uses the <a href="https://docs.github.com/en/rest" target="_blank" rel="noopener noreferrer">
                            GitHub REST API v3
                        </a>. Rate limits apply for unauthenticated requests.
                    </p>
                    <p>
                        Not affiliated with GitHub, Inc. This is an independent developer tool.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;