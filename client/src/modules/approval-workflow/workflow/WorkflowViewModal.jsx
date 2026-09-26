import { Modal, Card, Tag, Timeline, Space, Typography } from "antd";

const { Text } = Typography;

export default function WorkflowViewModal({ open, onClose, workflows = {} }) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1000}
      style={{ top: 20 }}
      destroyOnHidden={true}
      title="Workflow Details"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <Card
          key={workflows?.word_workflow_id}
          className="shadow-sm"
          title={
            <div className="flex justify-between items-center">
              <div>
                <Text strong className="text-lg text-white">
                  {workflows?.word_workflow_name}
                </Text>
                <div className="text-xs ">
                  Module: {workflows?.worm_module_name}
                </div>
              </div>

              <Tag color="blue">Version {workflows?.word_version}</Tag>
            </div>
          }
        >
          <Timeline>
            {workflows?.steps
              ?.slice()
              ?.sort((a, b) => a?.step_order - b?.step_order)
              ?.map((step) => (
                <Timeline.Item key={step?.step_id}>
                  {/* STEP HEADER */}
                  <div className="flex justify-between items-center">
                    <Text strong>
                      Step {step?.step_order}: {step?.step_name}
                    </Text>
                    <Tag color="purple">{step?.approver_type}</Tag>
                  </div>

                  {/* ROLE */}
                  <div className="text-sm text-gray-600 mt-1">
                    Role: <Text strong>{step?.role_name}</Text>
                  </div>

                  {/* APPROVERS */}
                  <div className="mt-2">
                    <Text type="secondary" className="text-xs">
                      Approvers
                    </Text>
                    <div className="mt-1">
                      <Space wrap>
                        {step?.approvers?.map((a) => (
                          <Tag key={a?.worsp_id} color="geekblue">
                            {a?.approver_name}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="mt-2">
                    <Text type="secondary" className="text-xs">
                      Actions
                    </Text>
                    <div className="mt-1">
                      <Space wrap>
                        {step?.actions?.map((act) => (
                          <Tag
                            key={act.action_id}
                            color={
                              act.action_name === "APPROVE" ? "green" : "orange"
                            }
                          >
                            {act?.action_name} → {act?.next_step}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  </div>
                </Timeline.Item>
              ))}
          </Timeline>
        </Card>
      </div>
    </Modal>
  );
}
