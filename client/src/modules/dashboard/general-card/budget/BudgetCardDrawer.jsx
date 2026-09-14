import { Collapse, Drawer, Spin, Table, Button } from "antd";
import { useEffect, useState } from "react";
import { getBudgetDetailsAPI } from "@/services/dashboard-service";
import { useSelector } from "react-redux";

const { Panel } = Collapse;
import { Tabs } from "antd";
import ThemeBudgetDrilldownChart from "./ThemeBudgetDrilldownChart";
const { TabPane } = Tabs;

const BudgetCardDrawer = ({ open, onClose }) => {
  const filterValues = useSelector((state) => state.dashboardFilterSlice);
  const [budgetDetails, setBudgetDetails] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ================= FETCH BUDGET DETAILS ================= */
  useEffect(() => {
    if (open) fetchBudgetDetails(filterValues);
  }, [open, filterValues]);

  const fetchBudgetDetails = async (filterValues) => {
    try {
      setLoading(true);
      const res = await getBudgetDetailsAPI(filterValues);
      setBudgetDetails(res?.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      title="Theme Wise Budget Details"
      placement="right"
      onClose={onClose}
      open={open}
      width={900}
      destroyOnHidden
      footer={
        <div style={{ textAlign: "right" }}>
          <Button type="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <Tabs defaultActiveKey="table">
        <TabPane tab="Table View" key="table">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Spin />
            </div>
          ) : budgetDetails?.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              No records found
            </div>
          ) : (
            <Collapse accordion>
              {budgetDetails?.map((theme) => {
                const themeTotal = theme?.activities?.reduce(
                  (sum, act) => sum + Number(act?.total_budget || 0),
                  0,
                );

                return (
                  <Panel
                    key={theme?.theme_id}
                    header={
                      <div className="flex justify-between w-full">
                        <span>{theme?.theme_name}</span>
                        <span>
                          Total: ₹{Number(themeTotal).toLocaleString("en-IN")}
                        </span>
                      </div>
                    }
                  >
                    {/* Activity Level */}
                    <Collapse accordion>
                      {theme?.activities?.map((activity) => (
                        <Panel
                          key={activity?.activity_id}
                          header={
                            <div className="flex justify-between w-full">
                              <span>{activity?.activity_name}</span>
                            </div>
                          }
                        >
                          {/* FY Breakdown Table */}
                          <Table
                            dataSource={activity?.fy_breakdown}
                            rowKey="fy_id"
                            pagination={false}
                            bordered
                            columns={[
                              {
                                title: "Financial Year",
                                dataIndex: "fy_name",
                              },
                              {
                                title: "Budget",
                                dataIndex: "budget",
                                render: (val) =>
                                  `₹${Number(val).toLocaleString("en-IN")}`,
                              },
                              {
                                title: "Utilized",
                                dataIndex: "utilized",
                                render: (val) =>
                                  `₹${Number(val).toLocaleString("en-IN")}`,
                              },
                              {
                                title: "Remaining",
                                dataIndex: "remaining",
                                render: (val) =>
                                  `₹${Number(val).toLocaleString("en-IN")}`,
                              },
                            ]}
                            summary={(pageData) => {
                              const totalBudget = pageData.reduce(
                                (sum, row) => sum + Number(row?.budget || 0),
                                0,
                              );

                              const totalUtilized = pageData.reduce(
                                (sum, row) => sum + Number(row?.utilized || 0),
                                0,
                              );

                              const totalRemaining = pageData.reduce(
                                (sum, row) => sum + Number(row?.remaining || 0),
                                0,
                              );

                              return (
                                <Table.Summary fixed>
                                  <Table.Summary.Row>
                                    <Table.Summary.Cell index={0}>
                                      <strong>Total</strong>
                                    </Table.Summary.Cell>

                                    <Table.Summary.Cell index={1}>
                                      <strong>
                                        ₹{totalBudget.toLocaleString("en-IN")}
                                      </strong>
                                    </Table.Summary.Cell>

                                    <Table.Summary.Cell index={2}>
                                      <strong>
                                        ₹{totalUtilized.toLocaleString("en-IN")}
                                      </strong>
                                    </Table.Summary.Cell>

                                    <Table.Summary.Cell index={3}>
                                      <strong className="text-green-600">
                                        ₹
                                        {totalRemaining.toLocaleString("en-IN")}
                                      </strong>
                                    </Table.Summary.Cell>
                                  </Table.Summary.Row>
                                </Table.Summary>
                              );
                            }}
                          />
                        </Panel>
                      ))}
                    </Collapse>
                  </Panel>
                );
              })}
            </Collapse>
          )}
        </TabPane>
        <TabPane tab="Chart View" key="chart">
          <div style={{ padding: 20 }}>
            <ThemeBudgetDrilldownChart data={budgetDetails} />
          </div>
        </TabPane>
      </Tabs>
    </Drawer>
  );
};

export default BudgetCardDrawer;
