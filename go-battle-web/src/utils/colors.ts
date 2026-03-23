export const COLORS = {
    dark: {
        text: {
            primary: "#c9d1d9",
            secondary: "#8b949e",
            muted: "#484f58",
        },
        bg: "#0d1117",
        primary: "#161b22",
        secondary: "#21262d",
        border: "#30363d",
        accent: "#58a6ff",
        success: "#3fb950",
        info: "#79c0ff",
        warning: "#d29922",
        danger: "#f85149",
    }
}

export const STATUS_COLORS: Record<string, string> = {
    'Complete': 'var(--success)',
    'In Progress': 'var(--primary)',
    'Pending': 'var(--warning)',
    'Error': 'var(--danger)',
    'Canceled': 'var(--text-muted)',
    'Incomplete': 'var(--text-muted)',
    'Stopped': 'var(--warning)',
    'Completed': 'var(--success)',
};

export const ELO_TIER_COLORS: Record<string, string> = {
    beginner: '#8b949e',
    novice: '#3fb950',
    intermediate: '#58a6ff',
    advanced: '#d29922',
    expert: '#f78166',
    master: '#f85149',
    grandmaster: '#bc8cff',
};

export function getEloTier(elo: number): string {
    if (elo < 1200) return 'beginner';
    if (elo < 1400) return 'novice';
    if (elo < 1600) return 'intermediate';
    if (elo < 1800) return 'advanced';
    if (elo < 2000) return 'expert';
    if (elo < 2200) return 'master';
    return 'grandmaster';
}
