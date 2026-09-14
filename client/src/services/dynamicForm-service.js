import { privateHttpClient, publicHttpClient } from "@/services/api/httpClient";

// ==========================================
// 🔒 Internal CSR Portal APIs (UNTOUCHED)
// ==========================================
export const dynamicGeneralListViewAPI = async (arg1, arg2) => {
  let url = "dynamic-form/general-list-view";
  let payload = {};

  if (typeof arg1 === "string") {
    url = arg1;
    payload = arg2 || {};
  } else if (typeof arg2 === "string") {
    url = arg2;
    payload = arg1 || {};
  } else {
    payload = arg1 || {};
  }

  return await privateHttpClient.post(url, payload);
};

export const dynamicViewListViewAPI = async (payload) => {
  return await privateHttpClient.post("dynamic-form/view-list-view", payload);
};

export const dynamicSchemaDetailsAPI = async (payload) => {
  return await privateHttpClient.post("dynamic-form/schema-details", payload);
};

export const dynamicMasterDetailsAPI = async (payload) => {
  return await privateHttpClient.post("dynamic-form/master-details", payload);
};

export const dynamicDetailsAPI = async (url, payload) => {
  return await privateHttpClient.post(url, payload);
};

export const dynamicFormViewAPI = async (url, payload) => {
  return await privateHttpClient.post(url, payload);
};

export const dynamicParentRecordAPI = async (payload) => {
  return await privateHttpClient.post("dynamic-form/parent-record", payload);
};

export const dynamicGeneralExportExcel = async (url, payload) => {
  return privateHttpClient.post(url, payload, {
    responseType: "blob",
  });
};

export const dynamicActiveInactiveAPI = async (url, payload) => {
  return await privateHttpClient.post(url, payload);
};

// ==========================================
// 🌐 Dedicated Public Form APIs (Separate)
// ==========================================
export const publicFormSchemaAPI = async (payload) => {
  return await publicHttpClient.post("public/forms/schema-details", payload);
};

export const publicFormMasterAPI = async (payload) => {
  return await publicHttpClient.post("public/forms/master-details", payload);
};

export const publicFormSubmitAPI = async (payload) => {
  return await publicHttpClient.post("public/forms/submit", payload);
};


