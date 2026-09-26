import { useState, useEffect } from "react";
import { Button, Modal, message } from "antd";
import { ExclamationCircleOutlined, ReloadOutlined } from "@ant-design/icons";

const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showPopup, setShowPopup] = useState(!navigator.onLine);

  useEffect(() => {
    const updateStatus = () => {
      if (navigator.onLine) {
        message.success({
          content: "You are back online!",
          duration: 3,
        });
      } else {
        setShowPopup(true);
      }
      setIsOnline(navigator.onLine);
    };

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-red-600">
          <ExclamationCircleOutlined className="text-2xl" /> No Internet
          Connection
        </div>
      }
      open={showPopup && !isOnline}
      footer={[
        <Button
          key="retry"
          type="primary"
          className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
          onClick={() => window.location.reload()}
        >
          <ReloadOutlined /> Retry
        </Button>,
      ]}
      closable={false}
      centered
      className="rounded-lg shadow-xl"
    >
      <p className="text-gray-600">
        You are offline. Please check your internet connection and try again.
      </p>
    </Modal>
  );
};

export default NetworkStatus;
