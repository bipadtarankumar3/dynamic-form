// client/src/modules/volunteering/components/VolunteeringMediaModal.jsx
"use client";

import React, { useState } from "react";
import { Modal, Button, Input, Upload, message, Popconfirm, Image, Empty } from "antd";
import {
  PictureOutlined,
  UploadOutlined,
  DeleteOutlined,
  PlusOutlined,
  VideoCameraOutlined
} from "@ant-design/icons";

export default function VolunteeringMediaModal({ open, onCancel, event, onUpdateEvent }) {
  const [msgApi, msgContextHolder] = message.useMessage();
  const initialMedia = (event?.media && event.media.length > 0) ? event.media : [
    { id: "m1", type: "photo", url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop", caption: "Volunteers planting mangrove saplings", author: "Priya Nair" },
    { id: "m2", type: "photo", url: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600&auto=format&fit=crop", caption: "Team group photo at Mahim Nature Park", author: "Rahul Varma" }
  ];

  const [mediaList, setMediaList] = useState(initialMedia);
  const [newUrl, setNewUrl] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [newAuthor, setNewAuthor] = useState("");

  if (!event) return null;

  const handleAddMedia = () => {
    if (!newUrl) {
      msgApi.error("Please provide an image or video URL.");
      return;
    }
    const newItem = {
      id: `m_${Date.now()}`,
      type: "photo",
      url: newUrl,
      caption: newCaption || "Volunteer activity proof",
      author: newAuthor || "Volunteer"
    };
    const updated = [...mediaList, newItem];
    setMediaList(updated);
    if (onUpdateEvent) {
      onUpdateEvent(event.id, { media: updated });
    }
    setNewUrl("");
    setNewCaption("");
    setNewAuthor("");
    msgApi.success("Media submitted successfully!");
  };

  const handleDeleteMedia = (id) => {
    const updated = mediaList.filter(m => m.id !== id);
    setMediaList(updated);
    if (onUpdateEvent) {
      onUpdateEvent(event.id, { media: updated });
    }
    msgApi.success("Media removed.");
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={
        <div className="flex items-center gap-2">
          <PictureOutlined className="text-blue-600 text-lg" />
          <span className="font-bold text-base">Photo & Video Submission Gallery</span>
        </div>
      }
      width={780}
      footer={[
        <Button key="close" type="primary" onClick={onCancel}>
          Done
        </Button>
      ]}
    >
      {msgContextHolder}
      <div className="space-y-4 py-2">
        {/* Upload / URL Input Bar */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
          <div className="text-xs font-bold text-slate-700">Submit New Photo / Video Proof:</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input
              size="small"
              placeholder="Image / Video URL"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
            <Input
              size="small"
              placeholder="Caption / Description"
              value={newCaption}
              onChange={(e) => setNewCaption(e.target.value)}
            />
            <div className="flex gap-2">
              <Input
                size="small"
                placeholder="Uploaded By (Name)"
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
              />
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={handleAddMedia}
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        {mediaList.length === 0 ? (
          <Empty description="No photos or videos submitted yet for this event." className="py-8" />
        ) : (
          <div className="vol-media-grid">
            <Image.PreviewGroup>
              {mediaList.map((m) => (
                <div key={m.id} className="vol-media-item group">
                  <Image
                    src={m.url}
                    alt={m.caption}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <div className="vol-media-caption">
                    <div className="truncate font-semibold">{m.caption}</div>
                    <div className="text-[10px] text-slate-300">By: {m.author}</div>
                  </div>
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Popconfirm
                      title="Delete this media?"
                      onConfirm={() => handleDeleteMedia(m.id)}
                    >
                      <Button size="small" type="primary" danger shape="circle" icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </div>
                </div>
              ))}
            </Image.PreviewGroup>
          </div>
        )}
      </div>
    </Modal>
  );
}
