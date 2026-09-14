import * as yup from "yup";
import dayjs from "dayjs";
import { resolveDateValue } from "../../general-section/helper/date.helper.js";
export const buildYupSchema = (fields) => {
  const shape = {};

  fields?.forEach((field) => {
    if (field?.visible === false) return;
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
        rule = yup.string();

        if (field?.required) {
          rule = rule.required(field?.messages?.required || "Required");
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

    shape[field?.db_field] = rule;
  });

  return yup.object().shape(shape);
};
