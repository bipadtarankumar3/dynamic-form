"use client";
// client/src/modules/approval-path/ApprovalPathListPage.jsx
// Premium Approval Path Listing Dashboard & Management View

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { message } from "antd";
import { BASE_API } from "./utils/approvalPathHelpers";
import ApprovalPathWizardModal from "./ApprovalPathWizardModal";
import ApprovalPathFlowModal from "./ApprovalPathFlowModal";
import ListPageHeader from "./components/list/ListPageHeader";
import ListPageStatsCards from "./components/list/ListPageStatsCards";
import ListPageFilterToolbar from "./components/list/ListPageFilterToolbar";
import ListPageTable from "./components/list/ListPageTable";
import { privateHttpClient } from "@/services/api/httpClient";
import "./approval-path.css";
import "./approval-path-new.css";

const ApprovalPathListPage = () => {
  const [messageApi, ctx] = message.useMessage();
  const [workflows, setWorkflows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [formList, setFormList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFormFilter, setSelectedFormFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");

  // Wizard Modal state (Add / Edit)
  const [wizardOpen, setWizardOpen] = useState(false);
  const [hasOpenedWizard, setHasOpenedWizard] = useState(false);
  const [selectedWorkflowForEdit, setSelectedWorkflowForEdit] = useState(null);

  // Flow Modal state (View Flow Only)
  const [flowModalOpen, setFlowModalOpen] = useState(false);
  const [selectedWorkflowForFlow, setSelectedWorkflowForFlow] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, rRes, fRes] = await Promise.allSettled([
        privateHttpClient.get(`${BASE_API}`),
        privateHttpClient.get(`auth/roles`),
        privateHttpClient.get(`configurator/form-schemas?limit=200`),
      ]);

      if (wRes.status === "fulfilled") {
        const rawWf = wRes.value?.data?.data || wRes.value?.data?.rows || wRes.value?.data || [];
        setWorkflows(Array.isArray(rawWf) ? rawWf : []);
      }
      if (rRes.status === "fulfilled") {
        const rawRoles = rRes.value?.data?.data || rRes.value?.data?.rows || rRes.value?.data || [];
        setRoles(Array.isArray(rawRoles) ? rawRoles : []);
      }
      if (fRes.status === "fulfilled") {
        const rawForms = fRes.value?.data?.data || fRes.value?.data?.rows || fRes.value?.data || [];
        const formArray = Array.isArray(rawForms) ? rawForms : [];
        setFormList(
          formArray.map((f) => ({
            label: f.title || f.name || f.slug,
            title: f.title || f.name || f.slug,
            name: f.title || f.name || f.slug,
            slug: f.slug || f.value || f.id,
            value: f.slug || f.value || f.id,
            id: f.id || f.form_id,
          }))
        );
      }
    } catch {
      messageApi.error("Failed to load approval paths");
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleStatus = async (wf, nextActive) => {
    const id = wf.wdf_id || wf.id;
    try {
      await privateHttpClient.put(`${BASE_API}/${id}`, {
        is_active: nextActive,
        is_draft: false,
      });
      messageApi.success(
        nextActive
          ? `Activated "${wf.wdf_name || wf.name}". Other paths for form "${wf.wdf_trigger_form || wf.trigger_form}" deactivated.`
          : `Deactivated "${wf.wdf_name || wf.name}"`
      );
      loadData();
    } catch (err) {
      messageApi.error(err?.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async (wf) => {
    const id = wf.wdf_id || wf.id;
    try {
      await privateHttpClient.delete(`${BASE_API}/${id}`);
      messageApi.success("Approval path deleted");
      loadData();
    } catch (err) {
      messageApi.error(err?.response?.data?.message || "Delete failed");
    }
  };

  const openAdd = () => {
    setSelectedWorkflowForEdit(null);
    setHasOpenedWizard(true);
    setWizardOpen(true);
  };

  const openEdit = (wf) => {
    setSelectedWorkflowForEdit(wf);
    setHasOpenedWizard(true);
    setWizardOpen(true);
  };

  const handleDuplicate = (wf) => {
    const cloned = {
      ...wf,
      wdf_id: null,
      id: null,
      wdf_name: `${wf.wdf_name || wf.name || "Workflow"} (Copy)`,
      name: `${wf.wdf_name || wf.name || "Workflow"} (Copy)`,
      wdf_slug: `${wf.wdf_slug || wf.slug || "workflow"}_copy_${Math.floor(1000 + Math.random() * 9000)}`,
      slug: `${wf.wdf_slug || wf.slug || "workflow"}_copy_${Math.floor(1000 + Math.random() * 9000)}`,
      is_draft: true,
      is_active: false,
    };
    setSelectedWorkflowForEdit(cloned);
    setHasOpenedWizard(true);
    setWizardOpen(true);
  };

  const openViewFlow = (wf) => {
    setSelectedWorkflowForFlow(wf);
    setFlowModalOpen(true);
  };

  // Metrics
  const stats = useMemo(() => {
    const total = workflows.length;
    const active = workflows.filter((w) => w.is_active && !w.is_draft).length;
    const drafts = workflows.filter((w) => w.is_draft).length;
    const uniqueForms = new Set(
      workflows.map((w) => w.wdf_trigger_form || w.trigger_form).filter(Boolean)
    ).size;
    return { total, active, drafts, uniqueForms };
  }, [workflows]);

  // Filtered List
  const filteredWorkflows = useMemo(() => {
    return workflows.filter((wf) => {
      const name = (wf.wdf_name || wf.name || "").toLowerCase();
      const slug = (wf.wdf_slug || wf.slug || "").toLowerCase();
      const trigger = (wf.wdf_trigger_form || wf.trigger_form || "").toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchesQuery =
        !query || name.includes(query) || slug.includes(query) || trigger.includes(query);
      const matchesForm =
        selectedFormFilter === "all" ||
        (wf.wdf_trigger_form || wf.trigger_form) === selectedFormFilter;
      const matchesStatus =
        selectedStatusFilter === "all" ||
        (selectedStatusFilter === "active" && wf.is_active && !wf.is_draft) ||
        (selectedStatusFilter === "draft" && wf.is_draft) ||
        (selectedStatusFilter === "inactive" && !wf.is_active && !wf.is_draft);

      return matchesQuery && matchesForm && matchesStatus;
    });
  }, [workflows, searchQuery, selectedFormFilter, selectedStatusFilter]);

  return (
    <div className="ap-page-container">
      {ctx}

      {/* Top Header */}
      <ListPageHeader onRefresh={loadData} onAdd={openAdd} loading={loading} />

      {/* KPI Stat Cards */}
      <ListPageStatsCards stats={stats} />

      {/* Filter & Search Toolbar */}
      <ListPageFilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedFormFilter={selectedFormFilter}
        onFormFilterChange={setSelectedFormFilter}
        selectedStatusFilter={selectedStatusFilter}
        onStatusFilterChange={setSelectedStatusFilter}
        formList={formList}
        stats={stats}
      />

      {/* Main Table */}
      <ListPageTable
        workflows={filteredWorkflows}
        loading={loading}
        roles={roles}
        formList={formList}
        onToggleStatus={handleToggleStatus}
        onViewFlow={openViewFlow}
        onEdit={openEdit}
        onClone={handleDuplicate}
        onDelete={handleDelete}
      />

      {/* Studio Wizard Modal (Add / Edit) */}
      {hasOpenedWizard && (
        <ApprovalPathWizardModal
          open={wizardOpen}
          onClose={() => {
            setWizardOpen(false);
            setSelectedWorkflowForEdit(null);
          }}
          onSuccess={() => {
            setWizardOpen(false);
            setSelectedWorkflowForEdit(null);
            loadData();
          }}
          initialWorkflow={selectedWorkflowForEdit}
          roles={roles}
          formList={formList}
        />
      )}

      {/* Flow Viewer Modal */}
      <ApprovalPathFlowModal
        open={flowModalOpen}
        onClose={() => {
          setFlowModalOpen(false);
          setSelectedWorkflowForFlow(null);
        }}
        workflow={selectedWorkflowForFlow}
        roles={roles}
      />
    </div>
  );
};

export default ApprovalPathListPage;
