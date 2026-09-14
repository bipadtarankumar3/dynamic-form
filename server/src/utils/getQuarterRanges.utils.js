const moment = require("moment");

const getQuarterRanges = (start_date, end_date) => {
  try {
    const start = moment(start_date);
    const end = moment(end_date);

    if (!start.isValid() || !end.isValid()) {
      throw new Error("Invalid start or end date.");
    }

    if (start.isAfter(end)) {
      throw new Error("Start date cannot be after end date.");
    }

    const result = [];
    let current = start.clone().startOf("quarter");

    while (current.isSameOrBefore(end)) {
      const quarterStart = current.clone();
      const quarterEnd = current.clone().endOf("quarter");

      const rangeStart = moment.max(quarterStart, start);
      const rangeEnd = moment.min(quarterEnd, end);

      result.push({
        year: current.year(),
        quarter: Math.floor(current.month() / 3) + 1,
        start_date: rangeStart.format("YYYY-MM-DD"),
        end_date: rangeEnd.format("YYYY-MM-DD"),
      });

      current.add(1, "quarter");
    }

    return result;
  } catch (error) {
    return [];
  }
};

module.exports = getQuarterRanges;
