export const getFormattedDate = () => {
  return new Date().toISOString().split(".")[0] + "Z";
};
