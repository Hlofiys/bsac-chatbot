export const convertDate = (date: string /*2025-01-18T10:03:00Z*/) => {
    const [dateFormat, timeFormat] = date.split('T');
    const [year, month, day] = dateFormat.split('-');
    const [ hours, minutes ] = timeFormat.split(':');
    return {
        date: `${day}.${month}.${year}`,
        time: `${hours}:${minutes}`
    }
}