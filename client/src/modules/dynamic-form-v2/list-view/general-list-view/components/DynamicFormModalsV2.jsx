"use client";

import React from "react";
import { Modal } from "antd";
import DynamicAddEditFormV2 from "@/modules/dynamic-form-v2/add-edit/DynamicAddEditFormV2";
import DynamicFormViewV2 from "@/modules/dynamic-form-v2/view/DynamicFormViewV2";

export default function DynamicFormModalsV2({
  openDynamicAddEditForm,
  handleCloseDynamicAddEditForm,
  getModalWidth,
  schema,
  formRef,
  formSlug,
  fetchData,
  selectedData,
  mode,
  urlListAPI,
  childrenInformation,
  openDynamicViewForm,
  setOpenDynamicViewForm,
}) {
  return (
    <>
      {/* Add / Edit Form Modal (V2 Engine) */}
      <Modal
        open={openDynamicAddEditForm}
        onCancel={handleCloseDynamicAddEditForm}
        width={getModalWidth ? getModalWidth() : "75vw"}
        style={{ top: 20, maxWidth: "96vw" }}
        title={schema?.title ? `${schema.title} Form` : "Dynamic Form"}
        footer={null}
        destroyOnHidden={true}
        maskClosable={false}
      >
        {openDynamicAddEditForm && (
          <DynamicAddEditFormV2
            ref={formRef}
            onClose={handleCloseDynamicAddEditForm}
            form_slug={formSlug}
            fetchData={fetchData}
            selectedData={selectedData}
            mode={mode}
            details_url_API={urlListAPI?.details_url_API}
            childrenInformation={childrenInformation}
          />
        )}
      </Modal>

      {/* View Form Modal (V2 Engine View Component) */}
      <Modal
        open={openDynamicViewForm}
        onCancel={() => setOpenDynamicViewForm(false)}
        width={getModalWidth ? getModalWidth() : "75vw"}
        style={{ top: 20, maxWidth: "96vw" }}
        title={"View " + (schema?.title || "Dynamic Form")}
        footer={null}
        destroyOnHidden={true}
        maskClosable={false}
      >
        {openDynamicViewForm && (
          <DynamicFormViewV2
            onClose={() => setOpenDynamicViewForm(false)}
            form_slug={formSlug}
            selectedData={selectedData}
            view_url_API={urlListAPI?.view_url_API || urlListAPI?.details_url_API}
            childrenInformation={childrenInformation}
          />
        )}
      </Modal>
    </>
  );
}
