const gradients = [
    'linear-gradient(135deg, #3b82f6, #8b5cf6)', // Blue-Purple
    'linear-gradient(135deg, #06b6d4, #3b82f6)', // Cyan-Blue
    'linear-gradient(135deg, #10b981, #06b6d4)', // Emerald-Cyan
    'linear-gradient(135deg, #f59e0b, #ef4444)', // Amber-Red
    'linear-gradient(135deg, #ec4899, #8b5cf6)'  // Pink-Purple
];

export function getAvatarGradient(str = '?') {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
}
