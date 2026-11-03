'use client';

import React, { useEffect, useState, useCallback } from 'react';
import SlimSidebar from '@/components/SlimSidebar';
import TopBar from '@/components/TopBar';
import PipelineBoard from '@/components/PipelineBoard';
import DetailDrawer from '@/components/DetailDrawer';
import AdvanceModal from '@/components/AdvanceModal';
import CreateOrderModal from '@/components/CreateOrderModal';
import AnalyticsView from '@/components/AnalyticsView';
import InventoryView from '@/components/InventoryView';
import AuditView from '@/components/AuditView';

import {
  ProcessStep,
  Resource,
  Order,
  AnalyticsOverview
} from '@/types';
import {
  fetchProcessSteps,
  fetchResources,
  fetchOrders,
  fetchAnalytics
} from '@/lib/api';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'analytics' | 'inventory' | 'audit'>('pipeline');
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [urgentOnly, setUrgentOnly] = useState(false);

  // Loading & Modals
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [advanceModalOrder, setAdvanceModalOrder] = useState<Order | null>(null);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [stepsData, resourcesData, ordersData, analyticsData] = await Promise.all([
        fetchProcessSteps(),
        fetchResources(),
        fetchOrders(),
        fetchAnalytics(),
      ]);

      setSteps(stepsData);
      setResources(resourcesData);
      setOrders(ordersData);
      setAnalytics(analyticsData);

      // If drawer is open, keep selectedOrder up to date
      setSelectedOrder((prev) => {
        if (!prev) return null;
        return ordersData.find((o) => o.id === prev.id) || prev;
      });
    } catch (err) {
      console.error('Failed to load manufacturing data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // Filtered orders for the pipeline board
  const filteredOrders = orders.filter((order) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchCase = order.case_id.toLowerCase().includes(q);
      const matchPatient = order.patient_ref.toLowerCase().includes(q);
      if (!matchCase && !matchPatient) return false;
    }

    if (selectedType !== 'ALL' && order.implant_type !== selectedType) {
      return false;
    }

    if (urgentOnly && order.priority !== 'URGENT') {
      return false;
    }

    return true;
  });

  const totalActiveCount = orders.filter((o) => o.status === 'IN_PROGRESS').length;
  const urgentCount = orders.filter((o) => o.priority === 'URGENT' && o.status === 'IN_PROGRESS').length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070B14] text-slate-100 font-sans">
      {/* 68px Metronic Slim Icon Sidebar */}
      <SlimSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <TopBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          urgentOnly={urgentOnly}
          setUrgentOnly={setUrgentOnly}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onOpenNewCaseModal={() => setIsNewCaseModalOpen(true)}
          totalActiveCount={totalActiveCount}
          urgentCount={urgentCount}
        />

        {/* Content Tabs */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400 font-mono">
              Connecting to Meticuly Plant API...
            </span>
          </div>
        ) : (
          <>
            {activeTab === 'pipeline' && (
              <PipelineBoard
                steps={steps}
                orders={filteredOrders}
                onSelectOrder={(order) => setSelectedOrder(order)}
                onAdvanceClick={(order, e) => {
                  e.stopPropagation();
                  setAdvanceModalOrder(order);
                }}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsView
                analytics={analytics}
                resources={resources}
                orders={orders}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryView resources={resources} />
            )}

            {activeTab === 'audit' && (
              <AuditView orders={orders} />
            )}
          </>
        )}
      </main>

      {/* Slide-over Detail Drawer (Metronic offcanvas pattern) */}
      <DetailDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onAdvanceClick={(order) => {
          setSelectedOrder(null);
          setAdvanceModalOrder(order);
        }}
      />

      {/* Advance Step Modal */}
      {advanceModalOrder && (
        <AdvanceModal
          order={advanceModalOrder}
          resources={resources}
          onClose={() => setAdvanceModalOrder(null)}
          onSuccess={(updatedOrder) => {
            loadData();
          }}
        />
      )}

      {/* Create New Case Modal */}
      {isNewCaseModalOpen && (
        <CreateOrderModal
          onClose={() => setIsNewCaseModalOpen(false)}
          onSuccess={(newOrder) => {
            loadData();
          }}
        />
      )}
    </div>
  );
}
