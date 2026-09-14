import {
  DownloadOutlined,
  PlusCircleOutlined,
  MoreOutlined,
  FileTextOutlined,
  CalendarOutlined,
  UserOutlined,
  AppstoreOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Button, Pagination, Spin, Table, App, Dropdown, Menu, Modal, Tag, Input } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "@/hooks/useNextRouter";
import { privateHttpClient } from "@/services/api/httpClient";
import { getUser } from "@/context/AuthContext";
import { hasModulePermissions } from "@/context/PermissionContext";
import FormBuilderModal from "./FormBuilderModal";
import "@/assets/css/form-builder/FormListView.css";


/* ── helpers ── */
const getAvatarGradient = (name = "Admin") => {
  const char = name.trim().charAt(0).toUpperCase();
  const code = char.charCodeAt(0) || 0;
  const gradients = [
    "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
  ];
  return gradients[code % gradients.length];
};

const initials = (name = "") =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

const InfoCard = ({ icon, label, value }) => (
  <div className="flv-info-card">
    <div className="flv-info-card-icon">{icon}</div>
    <div>
      <div className="flv-info-label">{label}</div>
      <div className="flv-info-value">{value || ""}</div>
    </div>
  </div>
);


const FormListView = () => {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const perms = hasModulePermissions("project_create_form");

  const { user_id } = getUser();
  const [mode, setMode] = useState(null);
  const [records, setRecords] = useState([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [projectDetails, setProjectDetails] = useState(null);
  const [kpiDetails, setKpiDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  /* ── Filtered & Paginated Records ── */
  const filteredRecords = useMemo(() => {
    if (!searchText.trim()) return records;
    const q = searchText.toLowerCase().trim();
    return records.filter((row) => {
      const name = (row.title || row.name || row.slug || "").toLowerCase();
      const creator = (row.created_by_name || "admin").toLowerCase();
      const isMaster = row.is_master ? "master" : "normal";
      const isDraft = row.is_draft ? "draft" : "submitted";
      return name.includes(q) || creator.includes(q) || isMaster.includes(q) || isDraft.includes(q);
    });
  }, [records, searchText]);

  const displayedRecords = useMemo(() => {
    // If backend already paginates, use filteredRecords directly
    if (totalRecords > records.length && records.length > 0) {
      return filteredRecords;
    }
    const start = (pagination.page - 1) * pagination.pageSize;
    return filteredRecords.slice(start, start + pagination.pageSize);
  }, [filteredRecords, pagination, totalRecords, records.length]);

  const effectiveTotal = useMemo(() => {
    if (totalRecords > records.length && records.length > 0) {
      return totalRecords;
    }
    return filteredRecords.length;
  }, [totalRecords, records.length, filteredRecords.length]);

  const [searchParams] = useSearchParams();
  const ctx = searchParams.get("ctx");

  const decoded = useMemo(() => {
    if (!ctx) return null;
    try {
      return JSON.parse(atob(ctx));
    } catch {
      return null;
    }
  }, [ctx]);

  const [openModal, setOpenModal] = useState(false);

  /* ── fetch project details ── */
  const fetchProjectDetails = async (decoded) => {
    try {
      setLoading(true);
      const res = await privateHttpClient.post("dynamic-form/view", {
        form_slug: "project",
        selected_data: {
          [decoded?.parent_primary_key]: decoded?.parent_primary_key_value,
        },
      });
      const apiData = res?.data?.data;
      setProjectDetails({
        project_title: apiData?.tprjct_project_title,
        project_start_date: apiData?.tprjct_project_duration_start_date,
        project_end_date: apiData?.tprjct_project_duration_end_date,
      });
      setKpiDetails(apiData?.kpi_details || null);
    } catch {
      message.error("Failed to load project details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log(decoded);

    if (!perms.includes("list")) return;
    if (decoded?.parent_primary_key_value) fetchProjectDetails(decoded);
  }, [decoded, perms]);

  /* ── handlers ── */
  const handleAdd = () => {
    setSelectedRow(null);
    setOpenModal(true);
  };
  const handleEdit = (row) => {
    setSelectedRow({ ...row, isView: false });
    setOpenModal(true);
  };
  const handleView = (row) => {
    const actions = row.fsc_actions || row.actions || [];
    const viewAction = actions.find((a) => a.slug === "view" || a.name?.toLowerCase() === "view");
    if (viewAction?.type === "OPEN_PAGE") {
      const slug = row.fsc_slug || row.slug;
      navigate(`/admin/forms/${slug}`);
    } else {
      setSelectedRow({ ...row, isView: true });
      setOpenModal(true);
    }
  };
  const handleClose = () => {
    setOpenModal(false);
    setSelectedRow(null);
  };
  const handleDeleteSchema = async (row) => {
    const schemaId = row.fsc_id || row.id;
    if (!schemaId) return;
    modal.confirm({
      title: "Delete Form",
      content: `Are you sure you want to delete form "${row.fsc_name || row.title}"?`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await privateHttpClient.delete(`configurator/form-schemas/${schemaId}`);
          message.success("Form deleted successfully");
          fetchFormTable();
        } catch {
          message.error("Failed to delete form");
        }
      },
    });
  };

  const handleFinalSubmit = async (row) => {
    const schemaId = row.fsc_id || row.id || row.slug;
    if (!schemaId) return;
    try {
      setLoadingTable(true);
      await privateHttpClient.put(`configurator/form-schemas/${schemaId}`, {
        is_draft: false,
      });
      message.success(`Form "${row.fsc_name || row.title}" submitted and table provisioned successfully!`);
      fetchFormTable();
    } catch {
      message.error("Failed to submit form");
    } finally {
      setLoadingTable(false);
    }
  };

  /* ── fetch table ── */
  const fetchFormTable = async () => {
    try {
      setLoadingTable(true);
      if (decoded?.parent_primary_key_value) {
        const res = await privateHttpClient.post(
          "form-builder/project-form-list-dt",
          {
            start: (pagination.page - 1) * pagination.pageSize,
            length: pagination.pageSize,
            prj_id: decoded?.parent_primary_key_value,
          },
        );
        setRecords(res?.data?.data || []);
        setTotalRecords(res?.data?.recordsTotal || 0);
      } else {
        const res = await privateHttpClient.get("configurator/form-schemas");
        const items = res?.data?.data || res?.data || [];
        setRecords(Array.isArray(items) ? items : []);
        setTotalRecords(Array.isArray(items) ? items.length : 0);
      }
    } catch {
      message.error("Failed to load table data");
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    if (!perms.includes("list")) return;
    fetchFormTable();
  }, [decoded, pagination, perms]);

  /* ── render ── */
  return (
    <>
      <div className="flv-root">
        <div className="animate-fade-in">
          {perms.includes("list") ? (
            <div className="flv-card">
              {/* HEADER */}
              <div className="flv-header">
                <div className="flv-header-left">
                  <div className="flv-header-icon">
                    <AppstoreOutlined />
                  </div>
                  <div>
                    <h5 className="flv-title">Forms Builder</h5>
                    <p className="flv-subtitle">
                      Manage and review form schemas, master configurations, and field builders
                    </p>
                  </div>
                </div>

                {perms.includes("add") && (
                  <button className="flv-add-btn" onClick={handleAdd}>
                    <PlusCircleOutlined style={{ fontSize: 13 }} />
                    New Form
                  </button>
                )}
              </div>

              {/* BODY */}
              <div className="flv-body">
                {/* PROJECT INFO */}
                {loading ? (
                  <div className="flv-spin-center">
                    <Spin size="small" />
                  </div>
                ) : projectDetails ? (
                  <div className="flv-info-grid" style={{ marginBottom: 22 }}>
                    <InfoCard
                      icon={<FileTextOutlined />}
                      label="Project Title"
                      value={projectDetails?.project_title}
                    />
                    <InfoCard
                      icon={<CalendarOutlined />}
                      label="Start Date"
                      value={projectDetails?.project_start_date}
                    />
                    <InfoCard
                      icon={<CalendarOutlined />}
                      label="End Date"
                      value={projectDetails?.project_end_date}
                    />
                  </div>
                ) : null}

                {/* TABLE SECTION HEADER & SEARCH */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
                  <p className="flv-section-label" style={{ margin: 0 }}>Forms</p>
                  <Input
                    placeholder="Search forms by name, status, or creator…"
                    allowClear
                    prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                    value={searchText}
                    onChange={(e) => {
                      setSearchText(e.target.value);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    style={{ width: 320, borderRadius: 8 }}
                  />
                </div>

                <div className="flv-table-wrap">
                  <table className="flv-table">
                    <thead>
                      <tr>
                        <th>Form Name</th>
                        <th>Parent Form</th>
                        <th>Is Master</th>
                        <th>Status</th>
                        <th>Created By</th>
                        <th>Created At</th>
                        <th className="center">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {loadingTable ? (
                        <tr>
                          <td colSpan={7}>
                            <div className="flv-spin-center">
                              <Spin size="small" />
                            </div>
                          </td>
                        </tr>
                      ) : displayedRecords.length === 0 ? (
                        <tr>
                          <td colSpan={7}>
                            <div className="flv-empty">
                              <div className="flv-empty-icon">
                                <FileTextOutlined />
                              </div>
                              <div>{searchText ? `No forms matching "${searchText}"` : "No forms found"}</div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        displayedRecords.map((row) => (
                          <tr key={row.fsc_id || row.pmon_id || row.form_id || row.id}>
                            {/* form name */}
                            <td>
                              <div className="flv-form-name">
                                <span className="flv-form-dot" />
                                {row.fsc_name || row.title || row.name}
                              </div>
                            </td>

                            {/* parent form */}
                            <td>
                              {(() => {
                                const parentId = row.parent_form_id;
                                const parentSlug = row.parent_slug;
                                
                                // Find parent object in records list if available
                                let parentObj = null;
                                if (parentId) {
                                  parentObj = records.find(r => String(r.id) === String(parentId));
                                }
                                if (!parentObj && parentSlug) {
                                  parentObj = records.find(r => String(r.slug).toLowerCase() === String(parentSlug).toLowerCase());
                                }

                                const parentTitle = parentObj?.title || parentObj?.name || row.parent_form_name || parentSlug;

                                if (!parentTitle && !parentId) {
                                  return (
                                    <Tag style={{ borderRadius: 12, padding: "2px 10px", color: "#94a3b8", backgroundColor: "#f8fafc", borderColor: "#cbd5e1" }}>
                                      🏠 Root Form
                                    </Tag>
                                  );
                                }

                                return (
                                  <Tag color="cyan" style={{ borderRadius: 12, padding: "2px 10px", fontWeight: 600 }}>
                                    🔗 {parentTitle || `Parent #${parentId}`}
                                  </Tag>
                                );
                              })()}
                            </td>

                            {/* is master */}
                            <td>
                              {row.is_master ? (
                                <Tag color="purple" style={{ borderRadius: 12, padding: "2px 10px", fontWeight: 600 }}>
                                  ⭐ Master
                                </Tag>
                              ) : (
                                <Tag style={{ borderRadius: 12, padding: "2px 10px", fontWeight: 500, color: "#64748b", backgroundColor: "#f1f5f9", borderColor: "#cbd5e1" }}>
                                  Normal
                                </Tag>
                              )}
                            </td>

                            {/* status */}
                            <td>
                              {row.is_draft ? (
                                <Tag color="warning" style={{ borderRadius: 12, padding: "2px 10px", fontWeight: 600 }}>
                                  📝 Draft
                                </Tag>
                              ) : (
                                <Tag color="success" style={{ borderRadius: 12, padding: "2px 10px", fontWeight: 600 }}>
                                  ✅ Submitted
                                </Tag>
                              )}
                            </td>

                            {/* created by */}
                            <td>
                              <div className="flv-creator">
                                <div className="flv-avatar" style={{ backgroundImage: getAvatarGradient(row.created_by_name || "Admin") }}>{initials(row.created_by_name || "Admin")}</div>
                                {row.created_by_name || "Admin"}
                              </div>
                            </td>

                            {/* date */}
                            <td>
                              <span className="flv-date-badge">
                                <CalendarOutlined style={{ fontSize: 11 }} />
                                {new Date(row.created_at || Date.now()).toLocaleDateString(
                                  "en-GB",
                                )}
                              </span>
                            </td>

                            {/* action */}
                            <td className="center">
                              <Dropdown
                                menu={{
                                  items: [
                                    {
                                      key: "edit",
                                      label: "✏️ Edit Form",
                                      onClick: () => handleEdit(row),
                                    },
                                    ...(row.is_draft
                                      ? [
                                          {
                                            key: "final_submit",
                                            label: "🚀 Final Submit (Create Table)",
                                            onClick: () => handleFinalSubmit(row),
                                          },
                                        ]
                                      : []),
                                    {
                                      key: "view",
                                      label: "👁️ View Form",
                                      onClick: () => handleView(row),
                                    },
                                    {
                                      key: "delete",
                                      label: "🗑️ Delete Form",
                                      danger: true,
                                      onClick: () => handleDeleteSchema(row),
                                    },
                                  ],
                                }}
                                trigger={["click"]}
                              >
                                <span className="flv-action-btn">
                                  <MoreOutlined />
                                </span>
                              </Dropdown>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION */}
                <div className="flv-pagination">
                  <Pagination
                    current={pagination.page}
                    pageSize={pagination.pageSize}
                    total={effectiveTotal}
                    size="small"
                    showSizeChanger
                    pageSizeOptions={["10", "20", "50", "100"]}
                    showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} forms`}
                    onChange={(page, pageSize) =>
                      setPagination({ page, pageSize })
                    }
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flv-no-perm">
              <span style={{ fontSize: 28 }}>🔒</span>
              You don't have permission to view this page.
            </div>
          )}

          {/* MODAL */}
          {openModal && (
            <FormBuilderModal
              open={openModal}
              onClose={handleClose}
              selectedRow={selectedRow}
              refreshTable={fetchFormTable}
              project_id={decoded?.parent_primary_key_value}
            />
          )}
        </div>
      </div>
      <div className="footer">
        <div className="container-fluid">
          <div className="copyright text-start">
            <a
              href="https://resilience.org.in/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {" "}
              Resilience Actions{" "}
            </a>
          </div>
          <div className="copyright text-end">
            Copyright © 2026, made with{" "}
            <a
              href="https://techcsr.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {" "}
              TechCSR{" "}
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default FormListView;
