import { Empty, Modal, Spin, Table, Tag } from "antd";
import moment from "moment";
import { useEffect, useState } from "react";
import { getAuditDetailsByIdAPI } from "@/services/audit-service";

const AuditDiffModal = ({ open, onClose, selectedData }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (open && selectedData) {
      fetchAuditDetails();
    }
  }, [open, selectedData]);

  const fetchAuditDetails = async () => {
    try {
      setLoading(true);
      const payload = {
        id: selectedData?.id,
      };
      const res = await getAuditDetailsByIdAPI(payload);
      setData(res.data.data);
    } catch (error) {
      console.error("Failed to fetch audit details", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const allDetails = data || {};
  const oldData = data?.old_data || {};
  const newData = data?.new_data || {};

  const allKeys = Array.from(
    new Set([...Object.keys(oldData), ...Object.keys(newData)]),
  );

  const formattedValue = (key, value) => {
    if (value === null || value === undefined) return "-";

    // Moment formatting
    if (key.includes("created_at") || key.includes("updated_at")) {
      return moment(value).format("DD-MM-YYYY hh:mm:ss A");
    }

    // 🔥 If already array
    if (Array.isArray(value)) {
      return value.filter(Boolean).join(", ");
    }

    // 🔥 If PostgreSQL array string: "{a,b,c}"
    if (
      typeof value === "string" &&
      value.startsWith("{") &&
      value.endsWith("}")
    ) {
      return value.slice(1, -1).split(",").filter(Boolean).join(", ");
    }

    // 🔥 If JSON string array: '["a","b"]'
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean).join(", ");
      }
    } catch (e) {
      // ignore parse error
    }

    return value.toString();
  };

  const tableData = allKeys.map((key) => {
    const oldVal = oldData[key];
    const newVal = newData[key];

    const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

    return {
      key,
      field: ["t_user", "t_documents"].includes(allDetails.table_name)
        ? key.replace(/_/g, " ").toUpperCase()
        : key.replace(/^.*?_/, "").replace(/_/g, " ").toUpperCase(),
      oldValue: formattedValue(key, oldVal),
      newValue: formattedValue(key, newVal),
      isChanged,
    };
  });

  const columns = [
    {
      title: "Field",
      dataIndex: "field",
      key: "field",
      width: 250,
    },
    {
      title: "Old Value",
      dataIndex: "oldValue",
      key: "oldValue",
      render: (text, record) =>
        record.isChanged ? <Tag color="red">{text}</Tag> : text,
    },
    {
      title: "New Value",
      dataIndex: "newValue",
      key: "newValue",
      render: (text, record) =>
        record.isChanged ? <Tag color="green">{text}</Tag> : text,
    },
  ];

  return (
    <Modal
      title="Audit Difference"
      open={open}
      onCancel={onClose}
      footer={null}
      width={1000}
      destroyOnHidden
      style={{ top: 30 }}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : !data ? (
        <Empty description="No audit data found" />
      ) : (
        <Table
          columns={columns}
          dataSource={tableData}
          pagination={false}
          bordered
          size="small"
          scroll={{ y: 400 }}
        />
      )}
    </Modal>
  );
};

export default AuditDiffModal;
