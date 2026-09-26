import dayjs from "dayjs";
export const getTableShimmer = (row, cols) => {
  let html = ``;
  for (let i = 0; i < row; i++) {
    html += `<div className="shimmer-table-row">`;
    for (let j = 0; j < cols; j++) {
      html += `<div className="shimmer shimmer-table-col"></div>`;
    }
    html += `</div>`;
  }

  return html;
};

export const calculateDuration = (start, end) => {
  if (!start || !end) return "";

  const startDate = dayjs(start);
  const endDate = dayjs(end);

  if (!startDate.isValid() || !endDate.isValid()) return "";

  const days = endDate.diff(startDate, "day") + 1; // inclusive
  return `${days} Days`;
};
