'use client';

import React from 'react';
import { Button, Dropdown } from 'antd';
import {
  MenuOutlined,
  PlusOutlined,
  LockOutlined,
  GlobalOutlined,
  ApartmentOutlined,PlusCircleOutlined,
  DownOutlined,
} from '@ant-design/icons';

import Image from "next/image";
import Menus from '@/assets/images/dashboard/Menus.png';
import InternalMenus from '@/assets/images/dashboard/InternalMenus.png';
import PublicMenus from '@/assets/images/dashboard/PublicMenus.png';
import SubMenuItems from '@/assets/images/dashboard/Sub-MenuItems.png';

export default function MenuStatsHeader({
  totalMenus = 0,
  internalCount = 0,
  publicCount = 0,
  subMenusCount = 0,
  onCreateMenu,
}) {
  const createMenuDropdownItems = [
    {
      key: 'internal_root',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
          <LockOutlined style={{ color: '#15803d' }} />
          <div>
            <strong>Internal System Menu</strong>
            <div style={{ fontSize: 11, color: '#64748b' }}>Add internal sidebar menu or folder</div>
          </div>
        </div>
      ),
      onClick: () => onCreateMenu('internal', null),
    },
    {
      key: 'public_menu',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
          <GlobalOutlined style={{ color: '#0284c7' }} />
          <div>
            <strong>Public Website Menu</strong>
            <div style={{ fontSize: 11, color: '#64748b' }}>Add public portal registration / website link</div>
          </div>
        </div>
      ),
      onClick: () => onCreateMenu('public', null),
    },
  ];

  return (
    <>
      {/* Top Header */}
      <div className="conf-page-header">
        <div className="conf-page-header-left">
          <div className="conf-page-header-icon">
            <MenuOutlined />
          </div>
          <div>
            <h1 className="conf-page-title">Navigation Menus</h1>
            <p className="conf-page-subtitle">
              Drag and drop to reorder menus, organize system navigation trees, and public website links
            </p>
          </div>
        </div>

        {/* Top Dropdown Create Button */}
        <Dropdown menu={{ items: createMenuDropdownItems }} trigger={['click', 'hover']} placement="bottomRight">
          <Button
            type="primary"
            icon={<PlusCircleOutlined />}
            className="conf-create-btn"
            style={{
              background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              height: '40px',
              padding: '0 20px',
            }}
          >
            Create Menu <DownOutlined style={{ fontSize: 11, marginLeft: 4 }} />
          </Button>
        </Dropdown>
      </div>

      {/* 4 KPI Stat Cards */}
      <div className="conf-stats-grid">
        <div className="conf-stat-card conf-stat-card--blue">
          <div className="conf-stat-icon-boxs">
             <Image src={Menus} alt="CSR Dashboard UI" width={200} height={200} />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Total Menus</span>
            <span className="conf-stat-val">{totalMenus}</span>
            <span className="conf-stat-sub">All navigation menu items</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--green">
          <div className="conf-stat-icon-boxs">
            <Image src={InternalMenus} alt="CSR Dashboard UI" width={200} height={200} />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Internal Menus</span>
            <span className="conf-stat-val">{internalCount}</span>
            <span className="conf-stat-sub">Sidebar root items & folders</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--orange">
          <div className="conf-stat-icon-boxs">
             <Image src={PublicMenus} alt="CSR Dashboard UI" width={200} height={200} />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Public Menus</span>
            <span className="conf-stat-val">{publicCount}</span>
            <span className="conf-stat-sub">Website public URL links</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--purple">
          <div className="conf-stat-icon-boxs">
            <Image src={SubMenuItems} alt="CSR Dashboard UI" width={200} height={200} />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Sub-Menu Items</span>
            <span className="conf-stat-val">{subMenusCount}</span>
            <span className="conf-stat-sub">Nested child navigation nodes</span>
          </div>
        </div>
      </div>
    </>
  );
}
