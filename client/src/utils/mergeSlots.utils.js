import moment from "moment";

export function mergeSlots(slots = []) {
  if (!slots || slots?.length === 0) return [];

  // Convert to time objects
  const parsed = slots?.map((s) => {
    const [start, end] = s?.label?.split(" - ");
    return {
      start: moment(start, "hh:mm A"),
      end: moment(end, "hh:mm A"),
    };
  });

  // Sort by start time
  parsed.sort((a, b) => a.start - b.start);

  const merged = [parsed[0]];

  for (let i = 1; i < parsed.length; i++) {
    const last = merged[merged.length - 1];
    const current = parsed[i];

    // Merge if adjacent
    if (current.start.isSame(last.end)) {
      last.end = current.end;
    } else {
      merged.push(current);
    }
  }

  // Calculate total duration
  const totalMinutes = merged.reduce(
    (sum, slot) => sum + slot.end.diff(slot.start, "minutes"),
    0
  );

  // 🕒 Convert total minutes to hours + mins
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const durationText =
    hours > 0 && minutes > 0
      ? `${hours} hr ${minutes} mins`
      : hours > 0
      ? `${hours} hr${hours > 1 ? "s" : ""}`
      : `${minutes} mins`;

  return {
    mergedLabels: merged.map(
      (m) => `${m.start.format("hh:mm A")} - ${m.end.format("hh:mm A")} (${durationText})`
    ),
    totalMinutes,
    durationText, // 👈 added readable text
  };
}
