import React from "react";
import { Result, Button } from "antd";
import { useNavigate } from "@/hooks/useNextRouter";

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <Result
        status="403"
        title="403 - Unauthorized"
        subTitle="Sorry, you are not authorized to access this page."
        extra={
          <Button type="primary" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        }
        className="bg-white p-6 rounded-2xl shadow-lg"
      />
    </div>
  );
};

export default Unauthorized;
