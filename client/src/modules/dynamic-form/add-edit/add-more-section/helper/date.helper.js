import dayjs from "dayjs";

export const resolveDateValue = (ruleValue, values) => {
  if (!ruleValue) return null;

  // today
  if (ruleValue === "today") {
    return dayjs().startOf("day");
  }

  // reference another field
  if (values?.[ruleValue]) {
    const d = dayjs(values[ruleValue], "YYYY-MM-DD", true);
    return d.isValid() ? d.startOf("day") : null;
  }

  // static date
  const staticDate = dayjs(ruleValue, "YYYY-MM-DD", true);
  return staticDate.isValid() ? staticDate.startOf("day") : null;
};
