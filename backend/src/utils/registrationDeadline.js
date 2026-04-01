export const normalizeRegistrationDeadline = (
  deadlineInput,
  startDate,
  startTime
) => {
  if (!deadlineInput) return undefined;

  const deadline = new Date(deadlineInput);
  if (Number.isNaN(deadline.getTime())) return undefined;

  const normalizedDeadline = new Date(deadline);
  normalizedDeadline.setHours(23, 59, 0, 0);

  let startDateTime = null;
  if (startDate) {
    const parsedStart = new Date(startDate);
    if (!Number.isNaN(parsedStart.getTime())) {
      if (typeof startTime === "string" && startTime.trim()) {
        const [hours = "0", minutes = "0"] = startTime.split(":");
        const h = Number(hours);
        const m = Number(minutes);
        parsedStart.setHours(
          Number.isNaN(h) ? 0 : h,
          Number.isNaN(m) ? 0 : m,
          0,
          0
        );
      }
      startDateTime = parsedStart;
    }
  }

  if (
    startDateTime &&
    startDateTime.toDateString() === normalizedDeadline.toDateString()
  ) {
    return startDateTime;
  }

  return normalizedDeadline;
};
