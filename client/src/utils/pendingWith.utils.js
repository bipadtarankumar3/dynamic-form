export function getCurrentPendingWith(row = {}, workflowDefinition = {}) {
  const { wori_status, wori_current_step_order } = row;

  // Approved
  if (wori_status === "APPROVED") {
    return "Approved";
  }

  // Resend
  if (wori_status === "RESEND") {
    return "Resend";
  }

  // Pending with current step
  if (wori_status === "PENDING") {
    const currentStep = workflowDefinition?.steps?.find(
      (step) => step?.step_order === wori_current_step_order
    );

    if (currentStep) {
      return `Pending with ${currentStep.role_name}`;
    }
  }

  return "In Progress";
}
