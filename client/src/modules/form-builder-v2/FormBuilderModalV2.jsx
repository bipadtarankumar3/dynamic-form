import React from 'react';
import { Modal } from 'antd';
import FormBuilderV2 from './FormBuilderV2';

export default function FormBuilderModalV2({
  open,
  onClose,
  initialSchema,
  onSuccess,
}) {
  if (!open) return null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width="100vw"
      className="fb-v2-fullscreen-modal"
      style={{
        top: 0,
        left: 0,
        margin: 0,
        padding: 0,
        maxWidth: '100vw',
        height: '100vh',
      }}
      styles={{
        body: { padding: 0, height: '100vh', overflow: 'hidden' },
        content: { padding: 0, borderRadius: 0, height: '100vh', overflow: 'hidden' },
      }}
      footer={null}
      destroyOnHidden
      closeIcon={null}
    >
      <FormBuilderV2
        initialSchema={initialSchema}
        onBack={onClose}
        onSuccess={() => {
          if (onSuccess) onSuccess();
          onClose();
        }}
      />
    </Modal>
  );
}
