import { InfoCircleOutlined } from "@ant-design/icons";
import { Modal } from "antd";
import { useState } from "react";

export const useAlertModal = () => {
  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState(null);
  const [onSubmit, setOnSubmit] = useState(null);
  const [icon, setIcon] = useState(null);
  const [loading, setLoading] = useState(false); // Loading state

  const showModal = (content, submitFunction, iconNode) => {
    setContent(content);
    setOnSubmit(() => submitFunction);
    setIcon(iconNode);
    setVisible(true);
  };

  const handleCancel = () => {
    if (loading) return; // Prevent closing while loading
    setVisible(false);
    setContent(null);
    setOnSubmit(null);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (onSubmit) {
      try {
        setLoading(true);
        await onSubmit(); // Await in case of async API
      } finally {
        setLoading(false);
        setVisible(false);
      }
    } else {
      setVisible(false);
    }
  };

  const ModalComponent = (
    <Modal
      title={
        <span>
          {icon ? (
            icon
          ) : (
            <InfoCircleOutlined style={{ color: "orange", marginRight: 8 }} />
          )}{" "}
          Action Required
        </span>
      }
      open={visible}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      maskClosable={!loading}
    >
      {content ?? ""}
    </Modal>
  );

  return { showModal, ModalComponent };
};
