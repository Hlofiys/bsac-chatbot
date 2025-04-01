export const getFormattedDate = () => {
  return new Date()
    .toLocaleString("ru-RU", {
      timeZone: "Europe/Minsk",
      hour12: false,
    })
    .replace(",", "")
    .replace(/\s/g, "T");
};
