'use client';

import React from "react";
import { IdcardOutlined } from "@ant-design/icons";
import { useSearchParams } from "@/hooks/useNextRouter";
import NgoFormRecordView from "../../_components/NgoFormRecordView";

export default function NgoProfilePage() {
  const [searchParams] = useSearchParams();
  // Allow overriding formSlug via query parameter ?form_slug=... or default to "implementation_partner"
  const formSlug = searchParams?.get("form_slug") || "implementation_partner";

  return (
    <NgoFormRecordView
      formSlug={formSlug}
      title="NGO Organization Profile"
      description="Review your organization profile details. View the field names and values below, click 'Update the profile' to submit via its dedicated API, or 'Edit Profile' to update."
      updateBtnLabel="Update the profile"
      editBtnLabel="Edit Profile"
      icon={<IdcardOutlined />}
      isVersioned={false}
      apiEndpoint="ngo/profile"
    />
  );
}
