"use client";

import React from "react";
import { Modal } from "antd";
import DynamicAddEditForm from "@/modules/dynamic-form/add-edit/DynamicAddEditForm";
import DynamicFormView from "@/modules/dynamic-form/view/DynamicFormView";

/**
 * Reusable Dynamic Form Modals Manager (Add/Edit Form Modal + View Form Modal)
 */
export default function DynamicFormModals({
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
  setOpenDynamicViewForm
}) {
  return (
    <>
      {/* Add / Edit Form Modal */}
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
          <DynamicAddEditForm
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

      {/* View Form Modal */}
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
          <DynamicFormView
            onClose={() => setOpenDynamicViewForm(false)}
            form_slug={formSlug}
            selectedData={selectedData}
            view_url_API={urlListAPI?.view_url_API}
            details_url_API={urlListAPI?.details_url_API}
          />
        )}
      </Modal>
    </>
  );
}
