import { Button, Col, DatePicker, Modal, Row } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  resetInitialState,
  setStateValue,
} from "../../store/slices/dashboardFilterSlice";
const { RangePicker } = DatePicker;
const initialLocalState = {
  from_date: "",
  to_date: "",
};

export default function DashboardFilterModal({ open, onClose, fetchData }) {
  const dispatch = useDispatch();

  // 🔥 Redux stored filter
  const storedFilter = useSelector((state) => state.dashboardFilterSlice);

  // 🔥 Local modal state
  const [localData, setLocalData] = useState(initialLocalState);

  /* ================= LOAD STORED FILTER INTO LOCAL WHEN MODAL OPENS ================= */
  useEffect(() => {
    if (open) {
      setLocalData(storedFilter);
    }
  }, [open, storedFilter]);

  /* ================= APPLY FILTER ================= */
  const handleApply = () => {
    // 🔥 Dispatch all local values to Redux
    Object.keys(localData).forEach((key) => {
      dispatch(setStateValue({ key, value: localData[key] }));
    });

    onClose();
  };

  /* ================= RESET LOCAL + REDUX ================= */
  const handleReset = () => {
    setLocalData(initialLocalState);
    dispatch(resetInitialState());
  };

  return (
    <Modal className="dashboard-filter-modal" 
      open={open}
      onCancel={onClose}
      width={600}
      style={{ top: 50 }}
      title="Dashboard Filter"
      maskClosable={false}
      destroyOnHidden
      footer={[
        <Button key="reset" danger onClick={handleReset}>
          Reset
        </Button>,
        <Button key="apply" type="primary" onClick={handleApply}>
          Apply
        </Button>,
      ]}
    >
      <Row gutter={16} className="h-15">
        <Col span={24}>
          <RangePicker
            allowClear
            classNames={{ popup: { root: "custom-range-dropdown" } }}
            format="DD-MM-YYYY"
            allowEmpty={[true, true]}
            style={{ width: "100%" }}
            value={
              localData?.from_date && localData?.to_date
                ? [
                    localData?.from_date
                      ? dayjs(localData?.from_date, "YYYY-MM-DD")
                      : null,
                    localData?.to_date
                      ? dayjs(localData?.to_date, "YYYY-MM-DD")
                      : null,
                  ]
                : null
            }
            onChange={(dates) => {
              if (dates?.[0] && dates?.[1]) {
                setLocalData((prev) => ({
                  ...prev,
                  from_date: dates[0].format("YYYY-MM-DD"),
                  to_date: dates[1].format("YYYY-MM-DD"),
                }));
              } else {
                setLocalData((prev) => ({
                  ...prev,
                  from_date: null,
                  to_date: null,
                }));
              }
            }}
          />
        </Col>
      </Row>
    </Modal>
  );
}
