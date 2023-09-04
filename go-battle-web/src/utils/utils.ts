import { PlayerScore } from "../models/PlayerScore"

export const translateClientLanguage = (languageCode: string) => {
    switch(languageCode) {
        case "py":
            return "Python"
        case "js":
            return "JavaScript"
        default:
            return "Unknown Language"
    }
}

export const pluck = (property: string | number) => (element: { [x: string]: any }) => element[property]

export const prettyDate = (date: string) => {
    const d = new Date(date)
    const prettyDate = `${leftZeroPad(d.getMonth()+1, 2)}/${leftZeroPad(d.getDate(), 2)}/${d.getFullYear()} ${leftZeroPad(d.getUTCHours(), 2)}:${leftZeroPad(d.getUTCMinutes(), 2)}:${leftZeroPad(d.getUTCSeconds(), 2)} UTC`;
    return prettyDate
}

export const leftZeroPad = (num: number | string, size: number) => {
    num = num.toString();
    while (num.length < size) num = "0" + num;
    return num;
}

export const slugify = (text: string) =>
  text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')

export const delay = (ms: number) => {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

export const elapsedTime = (start: Date, end: Date): number => {
    return new Date(end).getTime() - new Date(start).getTime();
}

export const prettyTimeAgo = (ms: number) => {
    let seconds = Math.floor(ms / 1000);
    let minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
    let hours = Math.floor(minutes / 60);
    minutes = minutes % 60;
    const days = Math.floor(hours / 24);
    hours = hours % 24;

    if (days > 1) {
        return `${days}d, ${hours}h, ${minutes}m`;
    } else if (hours > 1) {
        return `${hours}h, ${minutes}m`;
    } else if (minutes > 1) {
        return `${minutes}m, ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

export const allPlayersHaveSameScore = (players: PlayerScore[]) => {
    if (players.length !== 2) {
        let currentWins = players[0].wins;

        players.forEach((p) => {
            if(p.wins != currentWins) {
                return false;
            }
        });
    } else {
        return players[0].wins === players[1].wins;
    }
}
