export const COLORS = [
	'#FF0000', // Red
	'#FF7F00', // Orange
	'#FFFF00', // Yellow
	'#00FF00', // Lime
	'#00FFFF', // Cyan
	'#0000FF', // Blue
	'#8B00FF', // Violet
	'#FF1493', // Pink
	'#808080', // Gray
	'#000000', // Black
	'#FFFFFF', // White

	'#FF3B3F',
	'#FF9F1C',
	'#F9F871',
	'#1BE7FF',
	'#9B5DE5',
	'#F15BB5',
	'#00BBF9',
	'#00F5D4',
	'#073B4C',
	'#FF6B6B',
	'#FF9671',
	'#FFC75F',
	'#2EC4B6',
	'#845EC2',
	'#0081CF',
	'#4B4453',
	'#D65DB1',
	'#FF8066',
	'#00C9A7',
	'#C34A36',
	'#FF5E5B',
	'#6A0572',
	'#AB83A1',
	'#38B000',
	'#FFB703',
	'#219EBC',
	'#8ECAE6',
	'#E63946',
	'#F77F00',
	'#8338EC',
	'#3A86FF',
	'#FF006E',
	'#FB5607',
	'#FFBE0B',
	'#06D6A0',
	'#118AB2',
	'#EF476F',
	'#FFC300',
	'#FFD166',
	'#0aa67c',
	'#E76F51',
	'#2A9D8F',
	'#264653',
	'#F4A261',
	'#E9C46A',
];

// Helper function to get consistent color for a repo name
export const getRepoColor = (repoName: string): string => {
	// Simple hash function for consistent color assignment
	let hash = 0;
	for (let i = 0; i < repoName.length; i++) {
		hash = repoName.charCodeAt(i) + ((hash << 5) - hash);
	}

	// Ensure non-negative index
	const index = Math.abs(hash) % COLORS.length;
	return COLORS[index];
};

// Export a function that matches your main page's logic
export const getColorByIndex = (index: number): string => {
	return COLORS[index % COLORS.length];
};
