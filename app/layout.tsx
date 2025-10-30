import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'Activity Viewer',
    description: 'Visualize GitHub commit activity across repositories',
    icons: {
        icon: [
            { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
            { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        ],
        apple: '/apple-touch-icon.png',
    },
    manifest: '/site.webmanifest', // Move manifest here
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <head>
                {/* Add the missing favicon.ico as fallback */}
                <link rel="icon" href="/favicon.ico" />
            </head>
            <body className="bg-gradient-to-br from-gray-900 to-gray-800 min-h-screen text-white">
                {children}
            </body>
        </html>
    )
}