import { EyeOutlined, PlusCircleOutlined } from "@ant-design/icons";
import { Button, message, Spin } from "antd";
import { useEffect, useState } from "react";
import { workflowListAPI } from "@/services/approvalWorkflow-service";
import WorkflowModal from "./workflow/WorkflowModal";
import WorkflowViewModal from "./workflow/WorkflowViewModal";
import { hasModulePermissions } from "@/context/PermissionContext";

export default function ApprovalWorkflowBuilder() {
  const perms = hasModulePermissions("approval_workflow");
  const [workflows, setWorkflows] = useState([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [loading, setLoading] = useState(false);

  /* ================= FETCH ================= */
  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await workflowListAPI();
      setWorkflows(res?.data?.data || []);
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load workflows");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (perms.includes("list")) {
      fetchWorkflows();
    }
  }, [perms]);

  return (
    <div className="home-content p-3">
      <div className="card pb-3">
        <div className="card-header">
          <h5 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>
            Approval Workflows
          </h5>
          <div className="">
            {perms.includes("add") && (
              <Button
                type="primary"
                icon={<PlusCircleOutlined />}
                onClick={() => setOpenCreate(true)}
              >
                Create Workflow
              </Button>
            )}
          </div>
        </div>
        <div className="card-body">
          {/* TABLE */}
          <div className="overflow-x-auto">
            {perms.includes("list") ? (
              <>
                <table className="min-w-full border border-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 border text-left font-semibold">
                        Workflow Name
                      </th>
                      <th className="px-4 py-2 border text-left font-semibold">
                        Module
                      </th>
                      <th className="px-4 py-2 border text-center font-semibold w-24">
                        Version
                      </th>
                      <th className="px-4 py-2 border text-center font-semibold w-32">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="text-center py-6">
                          <Spin />
                        </td>
                      </tr>
                    ) : workflows?.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center py-6 text-gray-500"
                        >
                          No workflows found
                        </td>
                      </tr>
                    ) : (
                      workflows?.map((wf) => (
                        <tr
                          key={wf?.word_workflow_id}
                          className="hover:bg-gray-50 transition"
                        >
                          <td className="px-4 py-2 border">
                            {wf?.word_workflow_name}
                          </td>

                          <td className="px-4 py-2 border text-gray-700">
                            {wf?.worm_module_name}
                          </td>

                          <td className="px-4 py-2 border text-center">
                            {wf?.word_version}
                          </td>

                          <td className="px-4 py-2 border text-center">
                            {perms.includes("view") && (
                              <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => {
                                  setViewing(wf);
                                  setOpenView(true);
                                }}
                              >
                                View
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="text-center py-4 text-danger">
                You don't have permission.
              </div>
            )}
          </div>
        </div>
      </div>
      {/* CREATE MODAL */}
      {openCreate && (
        <WorkflowModal
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          fetchWorkflows={fetchWorkflows}
        />
      )}

      {/* VIEW MODAL */}
      {openView && viewing && (
        <WorkflowViewModal
          open={openView}
          workflows={viewing}
          onClose={() => {
            setViewing(null);
            setOpenView(false);
          }}
        />
      )}
    </div>
  );
}
