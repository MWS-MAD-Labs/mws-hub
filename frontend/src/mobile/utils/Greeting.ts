const jakartaHourFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: "Asia/Jakarta",
});

export const getGreeting = (date = new Date()) => {
  const hour = Number(jakartaHourFormatter.format(date));

  if (hour < 12) {
    return "Good morning";
  } else if (hour < 18) {
    return "Good afternoon";
  } else {
    return "Good evening";
  }
};
