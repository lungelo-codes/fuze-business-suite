"use client";
import React, { useState, useMemo } from "react";
import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import CrmPipelineClient from "@/components/crm/CrmPipelineClient";

type AnyRecord = Record<string, unknown>;

interface Props {
  dashboard: AnyRecord;
  pipelineSummary: AnyRecord;
  leads: AnyRecord[];
  customers: AnyRecord[];
  opportunities: AnyRecord[];
}

export default function CrmWorkspace({
  dashboard,
  pipelineSummary,
  leads,
  customers,
  opportunities,
}: Props) {
  const [activeTab, setActiveTab] = useState("Dashboard");

  // Map our data to the format expected by ModernModuleDashboard
  const metrics = [
    { label: "Total Leads", value: String(leads.length), hint: "In pipeline", icon: "target" },
    { label: "Opportunities", value: String(opportunities.length), hint: "Open deals", icon: "target" },
    { label: "Pipeline Value", value: String(pipelineSummary.total || "R 0.00"), hint: "Potential revenue", icon: "chart" },
    { label: "Customers", value: String(customers.length), hint: "Converted", icon: "person" },
  ];

  const actions = [
    { label: "New Lead", description: "Create a new CRM lead", icon: "target" },
    { label: "New Opportunity", description: "Create a new sales opportunity", icon: "target" },
    { label: "Send Quote", description: "Generate a quotation for a lead", icon: "quote" },
    { label: "Reports", description: "View CRM analytics", href: "/portal/reports", icon: "chart" },
  ];

  const tabs = ["Dashboard", "Pipeline", "Leads", "Opportunities", "Customers"];

  // Render the specific content based on the active tab
  const renderContent = () => {
    if (activeTab === "Pipeline") {
      return (
        <CrmPipelineClient
          initialDashboard={dashboard}
          initialPipelineSummary={pipelineSummary}
          initialLeads={leads}
          initialCustomers={customers}
          hideHeader={true}
        />
      );
    }

    // For other tabs, we can use the ModernModuleDashboard's built-in table
    // by passing the appropriate rows and config
    let rows: AnyRecord[] = [];
    let primaryField = "name";
    let secondaryField = "company";
    let statusField = "status";

    if (activeTab === "Leads") {
      rows = leads;
      primaryField = "lead_name";
    } else if (activeTab === "Opportunities") {
      rows = opportunities;
      primaryField = "opportunity_from";
      secondaryField = "customer_name";
    } else if (activeTab === "Customers") {
      rows = customers;
      primaryField = "customer_name";
    }

    return (
      <ModernModuleDashboard
        title="CRM Workspace"
        eyebrow="CRM & Sales"
        description="Manage your leads, opportunities, and customers in one place."
        mode="crm"
        rows={activeTab === "Dashboard" ? leads : rows}
        metrics={metrics}
        actions={actions}
        tabs={tabs}
        primaryField={primaryField}
        secondaryField={secondaryField}
        statusField={statusField}
      />
    );
  };

  return <div className="crm-workspace">{renderContent()}</div>;
}
