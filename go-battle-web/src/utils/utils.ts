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
