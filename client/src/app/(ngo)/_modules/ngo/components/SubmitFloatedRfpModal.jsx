import React, { useRef } from "react";
import {
  Modal, Tag, Typography, Row, Col, Space, Card, App, Divider
} from "antd";
import {
  SendOutlined,
  FileTextOutlined,
  DollarOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import DynamicAddEditFormV2 from "@/modules/dynamic-form-v2/add-edit/DynamicAddEditFormV2";
import { message as antdMessage } from "antd";

const { Text, Title } = Typography;

const getMessageApi = (appMessage) => {
  if (appMessage && typeof appMessage.success === "function") {
    return appMessage;
  }
  return antdMessage;
};

function SubmitFloatedRfpModalInner({
  open,
  onCancel,
  rfpRecord,
  formSlug = "rfp_submission",
  onSuccess
}) {
  const app = App.useApp();
  const messageApi = getMessageApi(app?.message);
  const formRef = useRef(null);

  if (!rfpRecord) return null;

  const rfpTitle =
    rfpRecord.project_details ||
    rfpRecord.rfp_title ||
    rfpRecord.title ||
    rfpRecord.name ||
    `RFP #${rfpRecord.id}`;

  const budget = rfpRecord.budget_amount || rfpRecord.budget || rfpRecord.total_budget || "—";
  const deadline = rfpRecord.submission_deadline || rfpRecord.deadline || rfpRecord.end_date;
  const deadlineFormatted = deadline && dayjs(deadline).isValid()
    ? dayjs(deadline).format("DD MMM YYYY")
    : (deadline || "—");

  return (
    <Modal
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-base">
            <SendOutlined />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 m-0">
              Submit RFP Proposal Form
            </h2>
            <p className="text-xs text-slate-500 m-0 font-normal">
              Fill and submit the proposal form configured for this RFP opportunity
            </p>
          </div>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
      width="78vw"
      style={{ top: 20, maxWidth: "1150px" }}
      maskClosable={false}
    >
      {/* ── RFP Context Summary Card ── */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Tag color="blue" className="font-bold rounded-md px-2 py-0.5 text-xs">
              {rfpRecord.rfp_code || `RFP-${rfpRecord.id}`}
            </Tag>
            <span className="font-bold text-slate-800 text-sm">{rfpTitle}</span>
          </div>
          {rfpRecord.project_category && (
            <Tag color="cyan" className="font-semibold rounded-md text-xs">
              {rfpRecord.project_category}
            </Tag>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
          <div className="flex items-center gap-1.5">
            <DollarOutlined className="text-emerald-600 font-semibold" />
            <span className="text-slate-500">Total Budget:</span>
            <span className="font-bold text-slate-800">
              {!isNaN(Number(budget)) ? `₹${Number(budget).toLocaleString("en-IN")}` : budget}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <CalendarOutlined className="text-blue-600 font-semibold" />
            <span className="text-slate-500">Submission Deadline:</span>
            <span className="font-bold text-slate-800">{deadlineFormatted}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <SafetyCertificateOutlined className="text-amber-600 font-semibold" />
            <span className="text-slate-500">Submission Mode:</span>
            <span className="font-semibold text-amber-700">1-Time Final Submission</span>
          </div>
        </div>
      </div>

      {/* ── Form Builder Dynamic Form Engine ── */}
      {open && (
        <DynamicAddEditFormV2
          ref={formRef}
          form_slug={formSlug || "rfp_submission"}
          parent_id={rfpRecord.id}
          mode="add"
          onClose={onCancel}
          onCustomAfterSubmit={async (res) => {
            messageApi.success("RFP Proposal submitted to CSR Admin successfully!");
            onCancel?.();
            if (onSuccess) onSuccess();
          }}
        />
      )}
    </Modal>
  );
}

export default function SubmitFloatedRfpModal(props) {
  return (
    <App>
      <SubmitFloatedRfpModalInner {...props} />
    </App>
  );
}
