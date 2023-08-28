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
    const prettyDate = `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()} ${d.getUTCHours()}:${d.getUTCMinutes()}:${d.getUTCSeconds()} UTC`;
    return prettyDate
}
