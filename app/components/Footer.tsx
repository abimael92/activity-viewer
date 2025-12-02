import React from 'react';
import { Github, Code, BarChart3, Heart } from 'lucide-react';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-gray-900/50 border-t border-gray-800 mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">

                    {/* Brand & Description */}
                    <div className="flex flex-col items-center md:items-start">
                        <div className="flex items-center space-x-2 mb-2">
                            <BarChart3 className="h-6 w-6 text-blue-400" />
                            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                                GitHub Activity Viewer
                            </span>
                        </div>
                        <p className="text-gray-400 text-sm max-w-md text-center md:text-left">
                            Visualize GitHub commit activity and gain insights into development patterns.
                            Built for developers, by developers.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className="flex flex-wrap justify-center gap-6">
                        <a
                            href="https://github.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors group"
                        >
                            <Github className="h-5 w-5 group-hover:text-blue-400 transition-colors" />
                            <span>GitHub API</span>
                        </a>

                        <a
                            href="#"
                            className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors group"
                        >
                            <Code className="h-5 w-5 group-hover:text-green-400 transition-colors" />
                            <span>Documentation</span>
                        </a>
                    </div>

                    {/* Tech Stack Badges */}
                    <div className="flex flex-wrap justify-center gap-2">
                        <span className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full text-xs font-medium border border-blue-800">
                            React 18
                        </span>
                        <span className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full text-xs font-medium border border-blue-800">
                            TypeScript
                        </span>
                        <span className="px-3 py-1 bg-green-900/50 text-green-300 rounded-full text-xs font-medium border border-green-800">
                            GitHub API
                        </span>
                        <span className="px-3 py-1 bg-orange-900/50 text-orange-300 rounded-full text-xs font-medium border border-orange-800">
                            Chart.js
                        </span>
                    </div>
                </div>

                {/* Divider */}
                <div className="my-6 border-b border-gray-800"></div>

                {/* Bottom Section */}
                <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                    <div className="text-gray-500 text-sm">
                        © {currentYear} GitHub Activity Viewer. All rights reserved.
                    </div>

                    <div className="flex items-center space-x-2 text-gray-500 text-sm">
                        <span>Made with</span>
                        <Heart className="h-4 w-4 text-red-500 animate-pulse" />
                        <span>for the developer community</span>
                    </div>

                    <div className="text-gray-500 text-sm">
                        <a
                            href="#"
                            className="hover:text-gray-300 transition-colors"
                        >
                            Privacy Policy
                        </a>
                        <span className="mx-2">•</span>
                        <a
                            href="#"
                            className="hover:text-gray-300 transition-colors"
                        >
                            Terms of Service
                        </a>
                    </div>
                </div>

                {/* Attribution */}
                <div className="mt-6 pt-4 border-t border-gray-800 text-center text-gray-600 text-xs">
                    <p>
                        This tool uses the GitHub API.
                        <a
                            href="https://docs.github.com/en/rest"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 text-gray-400 hover:text-gray-300 transition-colors"
                        >
                            GitHub REST API v3
                        </a>
                        • Rate limits may apply.
                    </p>
                    <p className="mt-1">
                        Not affiliated with GitHub, Inc. • This is an independent open-source project.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;