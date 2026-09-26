// client/src/modules/volunteering/components/VolunteeringStoryModal.jsx
"use client";

import React, { useState, useEffect } from "react";
import { Modal, Spin } from "antd";
import { ReadOutlined, AppstoreAddOutlined } from "@ant-design/icons";
import DynamicAddEditFormV2 from "@/modules/dynamic-form-v2/add-edit/DynamicAddEditFormV2";
import { getVolunteeringStoriesAPI } from "@/services/volunteering-service";

export default function VolunteeringStoryModal(props) {
  if (!props.open || !props.event) return null;
  return <VolunteeringStoryModalContent {...props} />;
}

function VolunteeringStoryModalContent({ open, onCancel, event, onUpdateEvent, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [existingStory, setExistingStory] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadExistingStory() {
      if (!event?.id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await getVolunteeringStoriesAPI({ event_id: event.id, all: true });
        if (isMounted && res?.data?.data && res.data.data.length > 0) {
          setExistingStory(res.data.data[0]);
        } else if (isMounted) {
          setExistingStory(null);
        }
      } catch (err) {
        if (isMounted) setExistingStory(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (open) {
      loadExistingStory();
    }
    return () => {
      isMounted = false;
    };
  }, [open, event?.id]);

  const eventName = event.event_name || event.title || `Event #${event.id}`;
  const mode = existingStory ? "edit" : "add";

  const selectedData = existingStory
    ? {
        ...existingStory,
        id: existingStory.id,
        event_id: event.id,
      }
    : {
        event_id: event.id,
        story_title: `Making a Lasting Difference: ${eventName}`,
        story_slug: `${eventName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        author_name: "CSR Communications & Impact Team",
        author_role: "Impact Lead",
        status: "Published",
      };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingRight: 24 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#faf5ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#7c3aed",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            <ReadOutlined />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
              {existingStory ? "Edit Impact Story" : "Publish Impact Story"}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
              FormBuilder Schema: <strong>Volunteering Impact Story</strong> (Parent Event: {eventName})
            </div>
          </div>
        </div>
      }
      width={"75vw"}
      style={{ top: 20, maxWidth: "96vw" }}
      footer={null}
      destroyOnHidden={true}
      maskClosable={false}
    >
      {loading ? (
        <div style={{ padding: 48, textAlign: "center" }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: "#64748b", fontWeight: 600 }}>
            Loading Impact Story Form Schema...
          </div>
        </div>
      ) : (
        <DynamicAddEditFormV2
          form_slug="volunteering_impact_story"
          mode={mode}
          selectedData={selectedData}
          parent_id={event.id}
          childrenInformation={{
            form_slug: "volunteering_impact_story",
            parent_primary_key: "event_id",
            parent_primary_key_value: event.id,
          }}
          onClose={() => {
            if (onCancel) onCancel();
          }}
          fetchData={() => {
            if (onUpdateEvent) onUpdateEvent(event.id, { has_story: true });
            if (onSuccess) onSuccess();
            if (onCancel) onCancel();
          }}
        />
      )}
    </Modal>
  );
}
