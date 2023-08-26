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
