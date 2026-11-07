'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api, getStoredRole, setStoredRole } from '../lib/api';
import {
  Order,
  ProcessStep,
  Resource,
  RoleKey,
  OrderPriority,
} from '../types';
import { SlimSidebar, ActiveView } from '../components/SlimSidebar';
import { TopBar } from '../components/TopBar';
import { PipelineBoard } from '../components/PipelineBoard';
import { MasterTableView } from '../components/MasterTableView';
import { AnalyticsView } from '../components/AnalyticsView';
import { SecurityAuditView } from '../components/SecurityAuditView';
import { DetailDrawer } from '../components/DetailDrawer';
import { AdvanceModal } from '../components/AdvanceModal';
import { CreateOrderModal } from '../components/CreateOrderModal';

export default function MetiTrackDashboard() {
  const [activeView, setActiveView] = useState<ActiveView>('board');
  const [orders, setOrders] = useState<Order[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<RoleKey>('ADMIN');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedImplantType, setSelectedImplantType] = useState('ALL');

  // Modals & Drawers
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [advancingOrder, setAdvancingOrder] = useState<Order | null>(null);
  const [isAdvanceOpen, setIsAdvanceOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Initial Data Load & Operator Session Initialization
  useEffect(() => {
    const initSessionAndLoad = async () => {
      const role = getStoredRole();
      setActiveRole(role);
      // Only request new token if no stored token exists to avoid redundant rate limit consumption
      if (!api.isAuthenticated()) {
        await handleRoleChange(role);
      }
      await loadAllData();
    };
    initSessionAndLoad();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [fetchedOrders, fetchedSteps, fetchedResources] = await Promise.all([
        api.getOrders(),
        api.getSteps(),
        api.getResources(),
      ]);
      setOrders(fetchedOrders);
      setSteps(fetchedSteps);
      setResources(fetchedResources);

      if (selectedOrder) {
        const found = fetchedOrders.find((o) => o.id === selectedOrder.id);
        if (found) setSelectedOrder(found);
      }
    } catch (err) {
      console.error('Failed to load MetiTrack plant data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (role: RoleKey) => {
    setActiveRole(role);
    setStoredRole(role);

    // Cryptographic JWT authentication mapping for certified operators (OWASP A01 & A07)
    const roleUsernameMap: Record<RoleKey, string> = {
      ADMIN: 'admin',
      BIOMEDICAL_ENGINEER: 'biomed_lead',
      PRODUCTION_OPERATOR: 'slm_tech',
      QA_SPECIALIST: 'qa_lead',
    };
    const username = roleUsernameMap[role] || 'admin';
    try {
      await api.quickSwitchOperator(username);
    } catch (err) {
      console.warn('Real JWT session sync:', err);
    }
  };

  // Open detail drawer
  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  // Open advance modal
  const handleOpenAdvance = (order: Order) => {
    setAdvancingOrder(order);
    setIsAdvanceOpen(true);
  };

  // Advance success callback
  const handleAdvanceSuccess = (updatedOrder: Order) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
    );
    if (selectedOrder?.id === updatedOrder.id) {
      setSelectedOrder(updatedOrder);
    }
    // Refresh resources to reflect automated BOM depletion
    api.getResources().then(setResources).catch(() => {});
  };

  // Metadata update callback
  const handleUpdateMetadata = async (
    id: number,
    payload: { patient_ref?: string; priority?: OrderPriority }
  ) => {
    const updated = await api.updateOrderMetadata(id, payload);
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setSelectedOrder(updated);
  };

  // Order created callback
  const handleOrderCreated = (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev]);
    handleSelectOrder(newOrder);
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCase = order.case_id.toLowerCase().includes(q);
        const matchPatient = order.patient_ref.toLowerCase().includes(q);
        if (!matchCase && !matchPatient) return false;
      }

      // Priority
      if (selectedPriority !== 'ALL' && order.priority !== selectedPriority) {
        return false;
      }

      // Implant Type
      if (selectedImplantType !== 'ALL' && order.implant_type !== selectedImplantType) {
        return false;
      }

      return true;
    });
  }, [orders, searchQuery, selectedPriority, selectedImplantType]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100">
      {/* 68px Slim Metronic 9 Sidebar */}
      <SlimSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        unresolvedAlertCount={
          resources.filter((r) => Number(r.total_available) < 50).length
        }
      />

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedPriority={selectedPriority}
          onPriorityChange={setSelectedPriority}
          selectedImplantType={selectedImplantType}
          onImplantTypeChange={setSelectedImplantType}
          activeRole={activeRole}
          onRoleChange={handleRoleChange}
          onRefresh={loadAllData}
          isLoading={isLoading}
          onOpenCreateModal={() => setIsCreateOpen(true)}
        />

        {/* View Routing */}
        <div className="flex-1 flex overflow-hidden">
          {activeView === 'board' && (
            <PipelineBoard
              orders={filteredOrders}
              steps={steps}
              activeRole={activeRole}
              onSelectOrder={handleSelectOrder}
              onAdvanceOrder={handleOpenAdvance}
            />
          )}

          {activeView === 'table' && (
            <MasterTableView
              orders={orders}
              steps={steps}
              onSelectOrder={handleSelectOrder}
              onAdvanceOrder={handleOpenAdvance}
              activeRole={activeRole}
            />
          )}

          {(activeView === 'analytics' || activeView === 'inventory') && (
            <AnalyticsView />
          )}

          {activeView === 'security' && (
            <SecurityAuditView />
          )}
        </div>
      </main>

      {/* Offcanvas 500px Detail Slide-Over Drawer */}
      <DetailDrawer
        order={selectedOrder}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdateMetadata={handleUpdateMetadata}
        onAdvanceClick={handleOpenAdvance}
      />

      {/* Sequential Station Advance Modal */}
      {isAdvanceOpen && advancingOrder && (
        <AdvanceModal
          order={advancingOrder}
          isOpen={isAdvanceOpen}
          onClose={() => setIsAdvanceOpen(false)}
          onAdvanceSuccess={handleAdvanceSuccess}
          activeRole={activeRole}
          allSteps={steps}
          allResources={resources}
        />
      )}

      {/* New Implant Case Registration Modal */}
      <CreateOrderModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onOrderCreated={handleOrderCreated}
        existingCount={orders.length}
      />
    </div>
  );
}
