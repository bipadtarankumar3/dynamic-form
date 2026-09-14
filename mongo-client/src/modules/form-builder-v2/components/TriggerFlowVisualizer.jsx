'use client';

import React, { useState } from 'react';
import { Button, Tag, Switch } from 'antd';
import {
  ThunderboltOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  SafetyCertificateOutlined,
  HeartFilled,
  BankOutlined,
  CodeOutlined,
  UserOutlined,
  CalculatorOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';

// Convert database snake_case to human friendly title
const toHumanTitle = (str) => {
  if (!str) return '';
  return str
    .replace(/^t_frm_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

export default function TriggerFlowVisualizer({ triggers = [], schema = {} }) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0); // 0: idle, 1: form action, 2: calculation, 3: result
  const [testAmount, setTestAmount] = useState(25000);
  const [isDevView, setIsDevView] = useState(false);

  const activeTrg = triggers[0] || {
    name: 'Automatic Balance Calculation',
    source_table: schema?.table_name || `t_frm_${schema?.slug || 'project'}`,
    target_table: 't_frm_project',
    events: ['insert', 'update'],
    watch_update_fields: ['amount'],
    actions: [
      {
        target_field: 'outstanding_amount',
        terms: [
          { source_type: 'target_column', field: 'project_amount', operator: '+' },
          { source_type: 'target_column', field: 'remaining_amount', operator: '-' },
        ],
      },
    ],
  };

  const firstAction = (activeTrg.actions && activeTrg.actions[0]) || {};
  const rawTargetCol = firstAction.target_field || 'outstanding_amount';
  const rawSourceCol = activeTrg.watch_update_fields?.[0] || 'amount';
  const rawTargetTable = activeTrg.target_table || 't_frm_project';
  const rawSourceTable = schema?.table_name || `t_frm_${schema?.slug || 'project'}`;

  // Human-friendly titles
  const friendlyFormName = schema?.title || toHumanTitle(rawSourceTable);
  const friendlyTargetName = toHumanTitle(rawTargetTable);
  const friendlyTargetCol = toHumanTitle(rawTargetCol);
  const friendlySourceCol = toHumanTitle(rawSourceCol);

  // Conditions in plain english
  const allConditions = [
    ...(Array.isArray(activeTrg.conditions) ? activeTrg.conditions : []),
    ...(Array.isArray(firstAction.conditions) ? firstAction.conditions : []),
  ];

  let friendlyConditionText = `Whenever a new record is created or ${friendlySourceCol} is modified`;
  if (allConditions.length > 0) {
    friendlyConditionText = allConditions
      .map((c) => `Only when ${toHumanTitle(c.field || rawSourceCol)} is ${c.operator || '='} '${c.value || ''}'`)
      .join(' AND ');
  }

  // Example calculation numbers
  const initialBudget = 500000;
  const previousSpent = 150000;
  const currentBalance = initialBudget - previousSpent;
  const calculatedNewBalance = currentBalance - testAmount;

  const runSimulation = (customAmt) => {
    if (isSimulating) return;
    const amt = typeof customAmt === 'number' ? customAmt : testAmount;
    setIsSimulating(true);
    setSimulationStep(1);

    setTimeout(() => {
      setSimulationStep(2);
    }, 850);

    setTimeout(() => {
      setSimulationStep(3);
    }, 1800);

    setTimeout(() => {
      setSimulationStep(0);
      setIsSimulating(false);
    }, 3400);
  };

  return (
    <div
      className="tfv-container"
      style={{
        width: '100%',
        background: '#ffffff',
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Human-crafted Clean CSS & Subtle Micro-Animations */}
      <style>{`
        .tfv-container {
          padding: 20px 24px;
        }
        .tfv-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        .tfv-header-title-box {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1 1 340px;
          min-width: 0;
        }
        .tfv-controls-box {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: flex-end;
        }
        .tfv-pipeline {
          display: grid;
          grid-template-columns: minmax(240px, 1fr) 40px minmax(260px, 1.25fr) 40px minmax(240px, 1fr);
          align-items: stretch;
          gap: 8px;
        }
        .tfv-conduit {
          position: relative;
          height: 100%;
          min-height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tfv-footer {
          margin-top: 18px;
          padding: 12px 16px;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 12px;
          color: #475569;
        }
        @media (max-width: 1200px) {
          .tfv-container {
            padding: 16px 18px;
          }
          .tfv-pipeline {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .tfv-conduit {
            height: 32px !important;
            min-height: 32px !important;
            margin: 2px auto;
          }
          .tfv-conduit-line {
            width: 2px !important;
            height: 100% !important;
          }
          .tfv-conduit-arrow {
            transform: rotate(90deg) !important;
          }
          .tfv-controls-box {
            justify-content: flex-start;
            width: 100%;
          }
        }
        @keyframes subtleFlowDot {
          0% { left: 0%; opacity: 0; transform: scale(0.8); }
          25% { opacity: 1; transform: scale(1.1); }
          75% { opacity: 1; transform: scale(1.1); }
          100% { left: 100%; opacity: 0; transform: scale(0.8); }
        }
      `}</style>

      {/* Top Header: Clear Title & Standard Enterprise Actions */}
      <div className="tfv-header">
        <div className="tfv-header-title-box">
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#e0e7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ThunderboltOutlined style={{ fontSize: 18, color: '#4f46e5' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.2px' }}>
                How this Automation Works
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                }}
              >
                Database Trigger
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                }}
              >
                Active
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              When a user submits data in <strong>{friendlyFormName}</strong>, the system automatically recalculates and updates <strong>{friendlyTargetName}</strong>.
            </div>
          </div>
        </div>

        {/* Controls: Mode Switch, Test Amounts, Run Demo Button */}
        <div className="tfv-controls-box">
          {/* Simple vs Developer Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#f8fafc',
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: !isDevView ? '#4f46e5' : '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
              <UserOutlined /> Simple
            </span>
            <Switch
              size="small"
              checked={isDevView}
              onChange={(checked) => setIsDevView(checked)}
            />
            <span style={{ fontSize: 11, fontWeight: 600, color: isDevView ? '#4f46e5' : '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CodeOutlined /> SQL Code
            </span>
          </div>

          {/* Test Amount Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f8fafc', padding: '4px 6px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, paddingLeft: 4 }}>Test:</span>
            {[10000, 25000, 50000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => {
                  setTestAmount(amt);
                  runSimulation(amt);
                }}
                disabled={isSimulating}
                style={{
                  border: testAmount === amt ? '1px solid #c7d2fe' : '1px solid transparent',
                  background: testAmount === amt ? '#e0e7ff' : 'transparent',
                  color: testAmount === amt ? '#4338ca' : '#64748b',
                  padding: '2px 7px',
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: isSimulating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                +₹{amt.toLocaleString('en-IN')}
              </button>
            ))}
          </div>

          {/* Run Demo Button */}
          <Button
            type="primary"
            icon={isSimulating ? <SyncOutlined spin /> : <PlayCircleOutlined />}
            onClick={() => runSimulation()}
            disabled={isSimulating}
            style={{
              background: isSimulating ? '#059669' : '#4f46e5',
              borderColor: isSimulating ? '#059669' : '#4f46e5',
              height: 36,
              padding: '0 16px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 12.5,
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
          >
            {isSimulating ? 'Simulating Update...' : 'Simulate Live Flow'}
          </Button>
        </div>
      </div>

      {/* 3 Step Workflow Pipeline */}
      <div className="tfv-pipeline">
        {/* ── STEP 1: FORM ENTRY (SOURCE) ── */}
        <div
          style={{
            background: simulationStep === 1 ? '#f5f3ff' : '#f8fafc',
            border: simulationStep === 1 ? '1px solid #818cf8' : '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '14px 16px',
            boxShadow: simulationStep === 1 ? '0 0 0 3px rgba(79, 70, 229, 0.12)' : 'none',
            transition: 'all 0.25s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4f46e5', display: 'inline-block' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Step 1 • Form Submission
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 4, background: '#ede9fe', color: '#6d28d9', border: '1px solid #ddd6fe' }}>
                On Create
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 4, background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>
                On Edit
              </span>
            </div>
          </div>

          {/* Form Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#ede9fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #ddd6fe',
                flexShrink: 0,
              }}
            >
              <HeartFilled style={{ fontSize: 16, color: '#7c3aed' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {friendlyFormName}
              </div>
              {isDevView ? (
                <code style={{ fontSize: 10.5, color: '#64748b' }}>Table: {rawSourceTable}</code>
              ) : (
                <div style={{ fontSize: 11, color: '#64748b' }}>User submits or edits this form</div>
              )}
            </div>
          </div>

          {/* User Data Box */}
          <div style={{ background: '#ffffff', padding: '9px 11px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 3 }}>
              <span>Monitored Field:</span>
              <strong style={{ color: '#0f172a' }}>{friendlySourceCol}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#64748b', marginBottom: 6 }}>
              <span>Submitted Value:</span>
              <span style={{ color: simulationStep === 1 ? '#059669' : '#0f172a', fontWeight: 700, fontSize: 12, background: simulationStep === 1 ? '#ecfdf5' : 'transparent', padding: '1px 5px', borderRadius: 4 }}>
                +₹{testAmount.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Condition */}
            <div style={{ paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 10, color: '#b45309', fontWeight: 600, marginBottom: 2 }}>
                When Trigger Fires:
              </div>
              <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.35 }}>
                {isDevView ? (
                  <code style={{ fontSize: 10, color: '#475569', background: '#f8fafc', padding: '2px 4px', borderRadius: 3, wordBreak: 'break-all' }}>
                    {allConditions.length > 0
                      ? allConditions.map((c) => `${c.field || rawSourceCol} ${c.operator || '='} '${c.value || ''}'`).join(' AND ')
                      : `(TG_OP = 'INSERT') OR (OLD.${rawSourceCol} IS DISTINCT FROM NEW.${rawSourceCol})`}
                  </code>
                ) : (
                  friendlyConditionText
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Connector 1 */}
        <div className="tfv-conduit">
          <div
            className="tfv-conduit-line"
            style={{
              width: '100%',
              height: 2,
              background: simulationStep >= 1 ? '#4f46e5' : '#cbd5e1',
              transition: 'all 0.25s ease',
            }}
          />
          {simulationStep >= 1 && (
            <div
              style={{
                position: 'absolute',
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: '#4f46e5',
                animation: 'subtleFlowDot 0.85s infinite ease-in-out',
              }}
            />
          )}
          <div
            className="tfv-conduit-arrow"
            style={{
              position: 'absolute',
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: simulationStep >= 1 ? '#4f46e5' : '#ffffff',
              border: simulationStep >= 1 ? '1px solid #4f46e5' : '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: simulationStep >= 1 ? '#ffffff' : '#94a3b8',
              fontSize: 9,
              fontWeight: 700,
            }}
          >
            ➔
          </div>
        </div>

        {/* ── STEP 2: AUTOMATIC CALCULATION ── */}
        <div
          style={{
            background: simulationStep === 2 ? '#f0fdf4' : '#f8fafc',
            border: simulationStep === 2 ? '1px solid #10b981' : '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '14px 16px',
            boxShadow: simulationStep === 2 ? '0 0 0 3px rgba(16, 185, 129, 0.12)' : 'none',
            transition: 'all 0.25s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Step 2 • Automatic Calculation
              </span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
              &lt; 0.01s Execution
            </span>
          </div>

          {/* Engine Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #a7f3d0',
                flexShrink: 0,
              }}
            >
              <CalculatorOutlined style={{ fontSize: 16, color: '#059669' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isDevView ? 'PostgreSQL Trigger Function' : 'System Auto-Calculates Formula'}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {isDevView ? 'Runs BEFORE INSERT/UPDATE' : 'Calculates atomically without manual work'}
              </div>
            </div>
          </div>

          {/* Formula Display */}
          <div style={{ background: '#ffffff', padding: '9px 11px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}>
              <span>{isDevView ? 'SQL Formula:' : 'Calculation Applied:'}</span>
              <span style={{ color: simulationStep === 2 ? '#059669' : '#64748b', fontWeight: 600 }}>
                {simulationStep === 2 ? 'Calculating...' : 'Ready'}
              </span>
            </div>

            <div
              style={{
                fontSize: 11.5,
                color: '#1e293b',
                fontWeight: 600,
                background: '#f8fafc',
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid #e2e8f0',
                fontFamily: isDevView ? 'monospace' : 'inherit',
                marginBottom: 6,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {isDevView
                ? `${rawTargetCol} = (project_amount - remaining_amount)`
                : `${friendlyTargetCol} = Project Budget - Total Spent`}
            </div>

            {/* Clear Visual Math */}
            <div style={{ fontSize: 11, color: '#475569', background: '#f8fafc', padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
              <span style={{ color: '#64748b' }}>Math:</span>
              <strong style={{ color: '#059669' }}>
                ₹{currentBalance.toLocaleString('en-IN')} − ₹{testAmount.toLocaleString('en-IN')} = ₹{calculatedNewBalance.toLocaleString('en-IN')}
              </strong>
            </div>
          </div>
        </div>

        {/* Connector 2 */}
        <div className="tfv-conduit">
          <div
            className="tfv-conduit-line"
            style={{
              width: '100%',
              height: 2,
              background: simulationStep >= 2 ? '#059669' : '#cbd5e1',
              transition: 'all 0.25s ease',
            }}
          />
          {simulationStep >= 2 && (
            <div
              style={{
                position: 'absolute',
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: '#059669',
                animation: 'subtleFlowDot 0.85s infinite ease-in-out',
              }}
            />
          )}
          <div
            className="tfv-conduit-arrow"
            style={{
              position: 'absolute',
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: simulationStep >= 2 ? '#059669' : '#ffffff',
              border: simulationStep >= 2 ? '1px solid #059669' : '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: simulationStep >= 2 ? '#ffffff' : '#94a3b8',
              fontSize: 9,
              fontWeight: 700,
            }}
          >
            ➔
          </div>
        </div>

        {/* ── STEP 3: RESULT IN TARGET RECORD ── */}
        <div
          style={{
            background: simulationStep === 3 ? '#ecfdf5' : '#f8fafc',
            border: simulationStep === 3 ? '1px solid #10b981' : '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '14px 16px',
            boxShadow: simulationStep === 3 ? '0 0 0 3px rgba(16, 185, 129, 0.12)' : 'none',
            transition: 'all 0.25s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Step 3 • Record Updated
              </span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
              {simulationStep === 3 ? '✓ Updated' : 'Auto-Synced'}
            </span>
          </div>

          {/* Target Record Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
                flexShrink: 0,
              }}
            >
              <BankOutlined style={{ fontSize: 16 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {friendlyTargetName} Record
              </div>
              {isDevView ? (
                <code style={{ fontSize: 10.5, color: '#64748b' }}>Table: {rawTargetTable}</code>
              ) : (
                <div style={{ fontSize: 11, color: '#64748b' }}>Master Project Budget Balance</div>
              )}
            </div>
          </div>

          {/* Results Box */}
          <div style={{ background: '#ffffff', padding: '9px 11px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 3 }}>
              <span>Target Column:</span>
              <strong style={{ color: '#0f172a' }}>{friendlyTargetCol}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
              <span>Previous Balance:</span>
              <span style={{ color: '#94a3b8', textDecoration: simulationStep === 3 ? 'line-through' : 'none' }}>
                ₹{currentBalance.toLocaleString('en-IN')}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: '#0f172a', background: simulationStep === 3 ? '#ecfdf5' : '#f8fafc', padding: '4px 8px', borderRadius: 6, border: simulationStep === 3 ? '1px solid #a7f3d0' : '1px solid #e2e8f0' }}>
              <span style={{ fontWeight: 600, color: simulationStep === 3 ? '#047857' : '#475569' }}>New Balance:</span>
              <span style={{ fontWeight: 700, color: '#059669', fontSize: 13, fontFamily: 'monospace' }}>
                ₹{calculatedNewBalance.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="tfv-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <SafetyCertificateOutlined style={{ color: '#059669', fontSize: 15, flexShrink: 0 }} />
          <span>
            <strong>Data Integrity Guarantee:</strong> Calculations execute automatically in the PostgreSQL database whenever records are saved. No manual spreadsheet updating is required.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 11, flexShrink: 0 }}>
          <CheckCircleOutlined style={{ color: '#059669' }} />
          <span>100% Audit Ready</span>
        </div>
      </div>
    </div>
  );
}
