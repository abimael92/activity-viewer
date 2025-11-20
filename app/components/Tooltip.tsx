// components/Tooltip.tsx
'use client';

import { useState } from 'react';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ content, children, position = 'top' }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="tooltip-container">
            <div
                className="tooltip-trigger"
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                onFocus={() => setIsVisible(true)}
                onBlur={() => setIsVisible(false)}
            >
                {children}
            </div>
            {isVisible && (
                <div className={`tooltip tooltip-${position}`}>
                    {content}
                    <div className="tooltip-arrow"></div>
                </div>
            )}
        </div>
    );
}