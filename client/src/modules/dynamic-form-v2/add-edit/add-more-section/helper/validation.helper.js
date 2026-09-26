import * as yup from "yup";
import dayjs from "dayjs";
import { resolveDateValue } from "../../general-section/helper/date.helper.js";
export const buildYupSchema = (fields = []) => {
  const shape = {};

  fields?.forEach((field) => {
    if (field?.visible === false) return;
    if (["heading", "note", "custom_html", "divider", "separator"].includes(field?.type)) return;

    let rule;

    switch (field?.type) {
      /* ===============================
         TEXT / TEXTAREA
      =============================== */
      case "text":
      case "textarea": {
        // rule = yup.string();
        rule = yup
          .string()
          .transform((value) =>
            typeof value === "string" ? value.trim() : value,
          );

        if (field?.required) {
          rule = rule.required(field?.messages?.required || "Required");
        }
        if (field?.validation?.email === true) {
          rule = rule.email(field?.messages?.email || "Enter a valid email");
        }
        if (field?.validation?.min_length !== undefined && field?.validation?.min_length !== null && field?.validation?.min_length !== "") {
          rule = rule.min(
            field?.validation?.min_length,
            field?.messages?.min_length,
          );
        }

        if (field?.validation?.max_length !== undefined && field?.validation?.max_length !== null && field?.validation?.max_length !== "") {
          rule = rule.max(
            field?.validation?.max_length,
            field?.messages?.max_length,
          );
        }

        if (field?.validation?.pattern) {
          rule = rule.matches(
            new RegExp(field?.validation?.pattern),
            field?.messages?.pattern,
          );
        }

        break;
      }

      /* ===============================
         NUMBER
      =============================== */
      case "number": {
        rule = yup
          .mixed()
          .nullable()
          .test(
            "is-valid-number",
            field?.messages?.type || "Must be a valid number",
            (value) => {
              if (value === undefined || value === null || value === "") return true;
              return !isNaN(Number(value)) && isFinite(Number(value));
            }
          );

        if (field?.required) {
          rule = rule.test(
            "required-number",
            field?.messages?.required || "Required",
            (value) => value !== undefined && value !== null && value !== ""
          );
        }

        // Negative check: Disallowed by default unless allow_negative is explicitly true
        const allowNegative = field?.validation?.allow_negative === true;
        if (!allowNegative) {
          rule = rule.test(
            "no-negative",
            field?.messages?.negative || "Negative values are not allowed",
            (value) => {
              if (value === undefined || value === null || value === "") return true;
              return Number(value) >= 0;
            }
          );
        }

        // Integer check
        const isIntegerOnly = field?.number_type === "integer" || field?.data_type === "integer";
        if (isIntegerOnly) {
          rule = rule.test(
            "integer-only",
            field?.messages?.integer || "Only whole numbers are allowed",
            (value) => {
              if (value === undefined || value === null || value === "") return true;
              return Number.isInteger(Number(value));
            }
          );
        }

        // Min value check
        if (field?.validation?.min !== undefined && field?.validation?.min !== null && field?.validation?.min !== "") {
          const effectiveMin = !allowNegative ? Math.max(0, Number(field.validation.min)) : Number(field.validation.min);
          rule = rule.test(
            "min-value",
            field?.messages?.min || `Minimum value is ${effectiveMin}`,
            (value) => {
              if (value === undefined || value === null || value === "") return true;
              return Number(value) >= effectiveMin;
            }
          );
        }

        // Max value check
        if (field?.validation?.max !== undefined && field?.validation?.max !== null && field?.validation?.max !== "") {
          const effectiveMax = Number(field.validation.max);
          rule = rule.test(
            "max-value",
            field?.messages?.max || `Maximum value is ${effectiveMax}`,
            (value) => {
              if (value === undefined || value === null || value === "") return true;
              return Number(value) <= effectiveMax;
            }
          );
        }

        if (field?.validation?.min_length !== undefined && field?.validation?.min_length !== null && field?.validation?.min_length !== "") {
          rule = rule.test(
            "min-length-if-present",
            field?.messages?.min_length,
            (value) =>
              value == null || value === ""
                ? true
                : String(value).replace("-", "").length >= field.validation.min_length,
          );
        }

        if (field?.validation?.max_length !== undefined && field?.validation?.max_length !== null && field?.validation?.max_length !== "") {
          rule = rule.test(
            "max-length-if-present",
            field?.messages?.max_length,
            (value) =>
              value == null || value === ""
                ? true
                : String(value).replace("-", "").length <= field.validation.max_length,
          );
        }

        if (field?.validation?.pattern) {
          rule = rule.test(
            "pattern-if-present",
            field?.messages?.pattern,
            (value) => {
              if (value === undefined || value === null || value === "") {
                return true;
              }

              return new RegExp(field.validation.pattern).test(String(value));
            },
          );
        }

        break;
      }

      case "date": {
        rule = yup
          .mixed()
          .nullable()

          /* ---------- VALID DATE ---------- */
          .test(
            "valid-date",
            field?.messages?.type || "Invalid date",
            (value) => {
              if (!value) return true;
              return dayjs(value, "YYYY-MM-DD", true).isValid();
            },
          );

        /* ---------- REQUIRED ---------- */
        if (field?.required) {
          rule = rule.test(
            "required",
            field?.messages?.required || "Required",
            (value) => value !== null && value !== undefined && value !== "",
          );
        }

        /* ---------- MIN DATE (DYNAMIC) ---------- */
        if (field?.validation?.min_date) {
          rule = rule.test(
            "min-date",
            field?.messages?.min_date || "Date is too early",
            function (value) {
              if (!value) return true;

              const current = dayjs(value, "YYYY-MM-DD", true).startOf("day");
              if (!current.isValid()) return true;

              const min = resolveDateValue(
                field?.validation?.min_date,
                this.parent, // full form values
              );

              if (!min) return true;

              return current.isSame(min) || current.isAfter(min);
            },
          );
        }

        /* ---------- MAX DATE (DYNAMIC) ---------- */
        if (field?.validation?.max_date) {
          rule = rule.test(
            "max-date",
            field?.messages?.max_date || "Date is too late",
            function (value) {
              if (!value) return true;

              const current = dayjs(value, "YYYY-MM-DD", true).startOf("day");
              if (!current.isValid()) return true;

              const max = resolveDateValue(
                field?.validation?.max_date,
                this.parent,
              );

              if (!max) return true;

              return current.isSame(max) || current.isBefore(max);
            },
          );
        }

        break;
      }

      case "date_range": {
        rule = yup
          .array()
          .nullable()

          /* ---------- VALID DATE RANGE ---------- */
          .test(
            "valid-range",
            field?.messages?.range || "Invalid date range",
            (value) => {
              if (!value) return true;
              if (!Array.isArray(value) || value?.length !== 2) return false;

              const [start, end] = value;

              return (
                dayjs(start, "YYYY-MM-DD", true).isValid() &&
                dayjs(end, "YYYY-MM-DD", true).isValid()
              );
            },
          )

          /* ---------- ORDER CHECK ---------- */
          .test(
            "order",
            field?.messages?.order || "End date must be after start date",
            (value) => {
              if (!value || value?.length !== 2) return true;

              const [start, end] = value;
              return !dayjs(end).isBefore(dayjs(start), "day");
            },
          );

        /* ---------- REQUIRED ---------- */
        if (field?.required) {
          rule = rule.test(
            "required",
            field?.messages?.required || "Date range is required",
            (value) => Array.isArray(value) && value?.length === 2,
          );
        }

        /* ---------- MIN DATE (DYNAMIC) ---------- */
        if (field?.validation?.min_date) {
          rule = rule.test(
            "min-date",
            field?.messages?.min_date || "Start date is too early",
            function (value) {
              if (!value || value?.length !== 2) return true;

              const [start] = value;
              const startDate = dayjs(start).startOf("day");

              const min = resolveDateValue(
                field?.validation?.min_date,
                this.parent, // full form values
              );

              if (!min) return true;

              return (
                startDate.isSame(min, "day") || startDate.isAfter(min, "day")
              );
            },
          );
        }

        /* ---------- MAX DATE (DYNAMIC) ---------- */
        if (field?.validation?.max_date) {
          rule = rule.test(
            "max-date",
            field?.messages?.max_date || "End date is too late",
            function (value) {
              if (!value || value?.length !== 2) return true;

              const [, end] = value;
              const endDate = dayjs(end).startOf("day");

              const max = resolveDateValue(
                field?.validation?.max_date,
                this.parent,
              );

              if (!max) return true;

              return endDate.isSame(max, "day") || endDate.isBefore(max, "day");
            },
          );
        }

        /* ---------- MIN RANGE (DAYS) ---------- */
        if (field?.validation?.min_range_days) {
          rule = rule.test(
            "min-range-days",
            field?.messages?.min_range_days || `Date range must span at least ${field.validation.min_range_days} days`,
            function (value) {
              if (!Array.isArray(value) || value.length !== 2 || !value[0] || !value[1]) return true;
              const [start, end] = value;
              const startDate = dayjs(start, "YYYY-MM-DD", true).startOf("day");
              const endDate = dayjs(end, "YYYY-MM-DD", true).startOf("day");
              if (!startDate.isValid() || !endDate.isValid()) return true;
              const spanDays = endDate.diff(startDate, "day") + 1;
              return spanDays >= Number(field.validation.min_range_days);
            },
          );
        }

        /* ---------- MAX RANGE (DAYS) ---------- */
        if (field?.validation?.max_range_days) {
          rule = rule.test(
            "max-range-days",
            field?.messages?.max_range_days || `Date range cannot exceed ${field.validation.max_range_days} days`,
            function (value) {
              if (!Array.isArray(value) || value.length !== 2 || !value[0] || !value[1]) return true;
              const [start, end] = value;
              const startDate = dayjs(start, "YYYY-MM-DD", true).startOf("day");
              const endDate = dayjs(end, "YYYY-MM-DD", true).startOf("day");
              if (!startDate.isValid() || !endDate.isValid()) return true;
              const spanDays = endDate.diff(startDate, "day") + 1;
              return spanDays <= Number(field.validation.max_range_days);
            },
          );
        }

        break;
      }

      /* ===============================
         SELECT
      =============================== */
      case "select": {
        if (field?.multiple) {
          rule = yup.array();

          const minItems =
            field?.validation?.min_items ?? (field?.required ? 1 : undefined);

          if (minItems !== undefined) {
            rule = rule.min(
              minItems,
              field?.messages?.min_items ||
                field?.messages?.required ||
                "At least one item required",
            );
          }

          if (field?.validation?.max_items !== undefined) {
            rule = rule.max(
              field?.validation?.max_items,
              field?.messages?.max_items,
            );
          }
        } else {
          rule = yup.mixed();

          if (field?.required) {
            rule = rule?.required(field?.messages?.required || "Required");
          }
        }

        break;
      }

      /* ===============================
         FILE
      =============================== */
      case "file": {
        rule = yup
          .array()

          /* ===============================
       REQUIRED / MIN ITEMS
    =============================== */
          .test(
            "required",
            field?.messages?.required || field?.messages?.min_items || "File is required",
            (value) => {
              const hasItems = Array.isArray(value) && value.length > 0;

              if (!field?.required) {
                if (!hasItems) return true;
                const min = Number(field?.validation?.min_items);
                if (min && value.length < min) return false;
                return true;
              }

              if (!hasItems) return false;
              const min = Number(field?.validation?.min_items) || 1;
              return value.length >= min;
            },
          )

          /* ===============================
       MAX ITEMS
    =============================== */
          .test("max-items", field?.messages?.max_items, (value) => {
            if (!Array.isArray(value) || value.length === 0) return true;

            // enforce single file if multiple=false
            const max =
              field?.file?.multiple === false
                ? 1
                : Number(field?.validation?.max_items);

            if (!max) return true;

            return value?.length <= max;
          })

          /* ===============================
       FILE TYPE CHECK (YOUR LOGIC)
    =============================== */
          .test(
            "file-type",
            field?.messages?.file_type || "Unsupported file type",
            (value) => {
              if (!Array.isArray(value) || value?.length === 0) return true;

              const allowed = field?.file?.allowed_types || [];
              if (!Array.isArray(allowed) || allowed.length === 0) return true;

              return value.every((file) => {
                const actualFile = file?.originFileObj || file?.url;

                // edit mode (already uploaded file)
                if (typeof actualFile === "string") {
                  return (
                    actualFile.startsWith("http") ||
                    actualFile.startsWith("https")
                  );
                }

                // new upload
                if (actualFile instanceof File) {
                  return allowed.includes(actualFile?.type);
                }

                return false;
              });
            },
          )

          /* ===============================
       FILE SIZE CHECK
    =============================== */
          .test("file-size", field?.messages?.file_size, (value) => {
            if (!Array.isArray(value) || value.length === 0) return true;

            const maxSizeMb = Number(field?.file?.max_size_mb);
            if (!maxSizeMb) return true;

            return value.every((file) => {
              const f = file?.originFileObj;
              if (!f) return true; // existing file
              return f.size / 1024 / 1024 <= maxSizeMb;
            });
          });

        break;
      }

      /* ===============================
         DEFAULT
      =============================== */
      default:
        rule = yup.mixed();
    }

    /* ===============================
       REQUIRED WHEN (COMMON)
    =============================== */
    if (field?.required_when) {
      const depField = Object.keys(field?.required_when)?.[0];
      const condition = field?.required_when?.[depField];

      rule = rule.when(depField, {
        is: (val) => {
          return Object.entries(condition).every(([op, expected]) => {
            switch (op) {
              case "not_null":
                return val !== null && val !== undefined && val !== "";

              case "equals":
                return val === expected;

              case "lt":
                return Number(val) < expected;

              case "lte":
                return Number(val) <= expected;

              case "gt":
                return Number(val) > expected;

              case "gte":
                return Number(val) >= expected;

              case "in":
                return Array.isArray(expected) && expected.includes(val);

              default:
                return true;
            }
          });
        },
        then: (schema) =>
          field?.type === "select" && field?.multiple
            ? schema.min(
                field?.validation?.min_items || 1,
                field?.messages?.min_items ||
                  field?.messages?.required ||
                  "Required",
              )
            : schema.required(field?.messages?.required || "Required"),
        otherwise: (schema) => schema,
      });
    }

    const key = field?.db_field || field?.column_name;
    if (rule && key) {
      shape[key] = rule;
    }
  });

  return yup.object().shape(shape);
};
