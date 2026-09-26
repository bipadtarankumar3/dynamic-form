import React from "react";
import {
  FaLeaf,
  FaShieldAlt,
  FaChessBoard,
  FaHandsHelping,
  FaHeart,
  FaHandHoldingHeart,
  FaTree,
  FaSeedling,
  FaRecycle,
  FaTint,
  FaGlobeAmericas,
  FaGraduationCap,
  FaHospital,
  FaUsers,
  FaLightbulb,
  FaChartLine,
  FaAward,
  FaBuilding,
  FaSun,
  FaSmile,
  FaMedal,
  FaBullseye,
} from "react-icons/fa";

export const BUBBLE_ICON_OPTIONS = [
  { key: "leaf", label: "Leaf / Eco Impact", icon: <FaLeaf /> },
  { key: "shield", label: "Shield / Compliance", icon: <FaShieldAlt /> },
  { key: "strategy", label: "Strategy / Chess", icon: <FaChessBoard /> },
  { key: "hands", label: "Helping Hands / Volunteering", icon: <FaHandsHelping /> },
  { key: "heart", label: "Heart / Healthcare", icon: <FaHeart /> },
  { key: "charity", label: "Social Support / Charity", icon: <FaHandHoldingHeart /> },
  { key: "tree", label: "Forestry / Nature", icon: <FaTree /> },
  { key: "seedling", label: "Growth / Agriculture", icon: <FaSeedling /> },
  { key: "recycle", label: "Recycle / Zero Waste", icon: <FaRecycle /> },
  { key: "water", label: "Water Conservation", icon: <FaTint /> },
  { key: "globe", label: "Global Reach / Outreach", icon: <FaGlobeAmericas /> },
  { key: "education", label: "Education / Youth", icon: <FaGraduationCap /> },
  { key: "hospital", label: "Medical / Healthcare", icon: <FaHospital /> },
  { key: "community", label: "Community / People", icon: <FaUsers /> },
  { key: "lightbulb", label: "Innovation / Energy", icon: <FaLightbulb /> },
  { key: "analytics", label: "Analytics / Metrics", icon: <FaChartLine /> },
  { key: "award", label: "Award / Excellence", icon: <FaAward /> },
  { key: "building", label: "Corporate Governance", icon: <FaBuilding /> },
  { key: "sun", label: "Solar / Renewable Power", icon: <FaSun /> },
  { key: "smile", label: "Wellbeing / Happiness", icon: <FaSmile /> },
  { key: "medal", label: "Achievement / Medal", icon: <FaMedal /> },
  { key: "bullseye", label: "Targets & SDGs", icon: <FaBullseye /> },
];

export const getBubbleIconComponent = (key, defaultIconKey = "leaf") => {
  const match = BUBBLE_ICON_OPTIONS.find((item) => item.key === (key || defaultIconKey));
  return match ? match.icon : <FaLeaf />;
};
