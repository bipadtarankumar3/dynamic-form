"use client";
// client/src/modules/approval-path/ApprovalPathWizard.jsx
// Backward-compatible export wrapping ApprovalPathWizardModal

import React from "react";
import ApprovalPathWizardModal from "./ApprovalPathWizardModal";

const ApprovalPathWizard = (props) => {
  return <ApprovalPathWizardModal open={true} {...props} />;
};

export default ApprovalPathWizard;
