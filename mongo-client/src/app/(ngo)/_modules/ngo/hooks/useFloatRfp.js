import { useState } from "react";
import { App, message as staticMessage } from "antd";
import { privateHttpClient } from "@/services/api/httpClient";

export default function useFloatRfp() {
  const [ngos, setNgos] = useState([]);
  const [loadingNgos, setLoadingNgos] = useState(false);
  const [masterCriteria, setMasterCriteria] = useState([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Use App context message to avoid static message warning
  let messageApi = staticMessage;
  try {
    const appCtx = App.useApp();
    if (appCtx?.message) {
      messageApi = appCtx.message;
    }
  } catch (e) {
    // Fallback to static message if outside App context
  }

  const notify = {
    success: (msg) => (typeof messageApi?.success === "function" ? messageApi.success(msg) : console.log(msg)),
    warning: (msg) => (typeof messageApi?.warning === "function" ? messageApi.warning(msg) : console.log(msg)),
    error: (msg) => (typeof messageApi?.error === "function" ? messageApi.error(msg) : console.error(msg)),
  };

  const fetchApprovedNgos = async () => {
    setLoadingNgos(true);
    try {
      const res = await privateHttpClient.get("ngo/approved-ngos");
      if (res.data?.success) {
        setNgos(res.data?.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch NGO users:", err);
    } finally {
      setLoadingNgos(false);
    }
  };

  const fetchMasterCriteria = async () => {
    setLoadingCriteria(true);
    try {
      const res = await privateHttpClient.get("ngo/criteria");
      if (res.data?.success) {
        setMasterCriteria(res.data?.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch master criteria:", err);
    } finally {
      setLoadingCriteria(false);
    }
  };

  const floatRfpToNgos = async ({ rfpId, selectedNgoIds, floatDate, remarks }, onSuccess) => {
    if (!rfpId) return;
    if (!selectedNgoIds || selectedNgoIds.length === 0) {
      notify.warning("Please select at least one NGO to float this RFP.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await privateHttpClient.post("ngo/float", {
        rfp_id: rfpId,
        ngo_ids: selectedNgoIds,
        float_date: floatDate,
        remarks: remarks || "",
      });

      if (res.data?.success) {
        notify.success(res.data?.message || "RFP floated successfully!");
        if (onSuccess) onSuccess();
      } else {
        notify.error(res.data?.message || "Failed to float RFP.");
      }
    } catch (err) {
      console.error("Float RFP error:", err);
      notify.error("An error occurred while floating RFP.");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    ngos,
    loadingNgos,
    masterCriteria,
    loadingCriteria,
    submitting,
    fetchApprovedNgos,
    fetchMasterCriteria,
    floatRfpToNgos,
  };
}
