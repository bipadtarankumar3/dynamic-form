// export const buildColumnsOptimized = (schema) => {
//   const columns = [];

//   // single schema loop
//   for (const section of schema?.sections || []) {
//     if (section?.type !== "general") continue;

//     for (const field of section?.fields) {
//       if (
//         // !field?.db_field ||
//         // field?.visible === false ||
//         // field?.type === "file"
//         !field?.db_field ||
//         field?.type === "file" ||
//         (field?.visible === false && field?.add_to_list !== true)
//       )
//         continue;

//       columns.push({
//         key: field?.db_field,
//         label: field?.label,
//         sortable: true,
//         getValue: (row) => {
//           // MASTER SELECT (single + multiple)
//           if (
//             field?.type === "select" &&
//             field?.data_source?.type === "master"
//           ) {
//             const labelCol = field?.data_source?.label_key || "name";
//             const aliasKey = `${labelCol}_${field.db_field}`;

//             let value = row[aliasKey];

//             // fallback if label missing or empty
//             if (
//               value === null ||
//               value === undefined ||
//               (Array.isArray(value) && value.length === 0)
//             ) {
//               value = row[field?.db_field];
//             }

//             if (value === null || value === undefined) return "-";

//             // array (string[] OR {label,value}[])
//             if (Array.isArray(value)) {
//               return value
//                 .map((v) => (typeof v === "string" ? v : v?.label))
//                 .join(", ");
//             }

//             // single → string
//             return value;
//           }

//           // DATE RANGE
//           if (
//             field.type === "date_range" &&
//             field.act_db_field?.start &&
//             field.act_db_field?.end
//           ) {
//             const start = row[field?.act_db_field?.start];
//             const end = row[field?.act_db_field?.end];

//             if (!start && !end) return "-";
//             if (start && end) return `${start} → ${end}`;
//             if (start) return `From ${start}`;
//             return `Until ${end}`;
//           }

//           // ==========================
//           // CREATED BY / USER NAME
//           // ==========================
//           if (row[`name_${field.db_field}`] !== undefined) {
//             return row[`name_${field.db_field}`] || "-";
//           }

//           // ==========================
//           // DATE FORMAT (_at fields)
//           // ==========================
//           // if (
//           //   typeof row[field.db_field] === "string" &&
//           //   field.db_field.endsWith("_at")
//           // ) {
//           //   return new Date(row[field.db_field]).toLocaleString();
//           // }
//           if (
//             typeof row[field.db_field] === "string" &&
//             field.db_field.endsWith("_at")
//           ) {
//             const d = new Date(row[field.db_field]);

//             const day = String(d.getDate()).padStart(2, "0");
//             const month = String(d.getMonth() + 1).padStart(2, "0");
//             const year = d.getFullYear();

//             return `${day}/${month}/${year}`;
//           }

//           // fallback
//           const v = row[field?.db_field];
//           if (v === null || v === undefined) return "-";
//           if (Array.isArray(v)) return v.join(", ");
//           if (typeof v === "object") return "-";
//           return v;
//         },
//       });
//     }
//   }

//   return columns;
// };

export const buildColumnsOptimized = (schema) => {
  const normalColumns = [];
  const createdByColumns = [];
  const createdAtColumns = [];

  for (const section of schema?.sections || []) {
    if (section?.type !== "general") continue;

    for (const field of section?.fields) {
      if (
        !field?.db_field ||
        field?.type === "file" ||
        (field?.visible === false && field?.add_to_list !== true)
      ) {
        continue;
      }

      const col = {
        key: field?.db_field,
        label: field?.label,
        sortable: true,
        getValue: (row) => {
          // ==========================
          // MASTER SELECT (single + multiple)
          // ==========================
          if (
            field?.type === "select" &&
            field?.data_source?.type === "master"
          ) {
            const labelCol = field?.data_source?.label_key || "name";
            const aliasKey = `${labelCol}_${field.db_field}`;

            let value = row[aliasKey];

            if (
              value === null ||
              value === undefined ||
              (Array.isArray(value) && value.length === 0)
            ) {
              value = row[field?.db_field];
            }

            if (value === null || value === undefined) return "-";

            if (Array.isArray(value)) {
              return value
                .map((v) => (typeof v === "string" ? v : v?.label))
                .join(", ");
            }

            return value;
          }

          // ==========================
          // DATE RANGE
          // ==========================
          if (
            field.type === "date_range" &&
            field.act_db_field?.start &&
            field.act_db_field?.end
          ) {
            const start = row[field?.act_db_field?.start];
            const end = row[field?.act_db_field?.end];

            if (!start && !end) return "-";
            if (start && end) return `${start} → ${end}`;
            if (start) return `From ${start}`;
            return `Until ${end}`;
          }

          // ==========================
          // CREATED BY / USER NAME
          // Checks multiple alias patterns the backend may return
          // ==========================
          if (
            field.db_field === "created_by" ||
            field.db_field === "updated_by" ||
            field.db_field === "modified_by" ||
            field.db_field.endsWith("_created_by") ||
            field.db_field.endsWith("_by")
          ) {
            // Try all common alias patterns from backend
            const aliases = [
              `name_${field.db_field}`,          // name_created_by
              `${field.db_field}_name`,          // created_by_name
              `username_${field.db_field}`,      // username_created_by
              `full_name_${field.db_field}`,     // full_name_created_by
              `${field.db_field}_username`,      // created_by_username
              `${field.db_field}_full_name`,     // created_by_full_name
            ];
            for (const alias of aliases) {
              if (row[alias] !== undefined && row[alias] !== null && row[alias] !== "") {
                return row[alias];
              }
            }
            // If value is a plain integer (user ID), show it as "User #ID"
            const rawVal = row[field.db_field];
            if (rawVal !== null && rawVal !== undefined) {
              if (typeof rawVal === "number" || (typeof rawVal === "string" && /^\d+$/.test(rawVal))) {
                return `User #${rawVal}`;
              }
              return rawVal;
            }
            return "-";
          }

          // Generic fallback for other fields with name_ prefix alias
          if (row[`name_${field.db_field}`] !== undefined) {
            return row[`name_${field.db_field}`] || "-";
          }

          // ==========================
          // DATE FORMAT (_at fields)
          // ==========================
          if (
            typeof row[field.db_field] === "string" &&
            field.db_field.endsWith("_at")
          ) {
            const d = new Date(row[field.db_field]);

            const day = String(d.getDate()).padStart(2, "0");
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const year = d.getFullYear();

            return `${day}/${month}/${year}`;
          }

          // ==========================
          // BOOLEAN (Active / Inactive)
          // ==========================
          if (typeof row[field.db_field] === "boolean") {
            return row[field.db_field] ? "Active" : "Inactive";
          }

          // ==========================
          // FALLBACK
          // ==========================
          const v = row[field?.db_field];
          if (v === null || v === undefined) return "-";
          if (Array.isArray(v)) return v.join(", ");
          if (typeof v === "object") return "-";
          if (typeof v === "string" && (field?.type === "textarea" || /<[a-z][\s\S]*>/i.test(v))) {
            const cleanText = v.replace(/<[^>]*>/g, "").trim();
            return cleanText || "-";
          }
          return v;
        },
      };

      // ==========================
      // COLUMN ORDER CONTROL
      // ==========================
      if (field.db_field.endsWith("_created_by")) {
        createdByColumns.push(col);
      } else if (field.db_field.endsWith("_at")) {
        createdAtColumns.push(col);
      } else {
        normalColumns.push(col);
      }
    }
  }

  // ==========================
  // FINAL COLUMN ORDER
  // ==========================
  return [
    ...normalColumns, // State Name, etc.
    ...createdByColumns, // Created By
    ...createdAtColumns, // Created At
  ];
};
