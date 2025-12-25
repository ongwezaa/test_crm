import { useEffect, useState } from "react";
import type { Account, Deal, Stage } from "@local-crm/shared";
import { apiRequest } from "../api/client";

export default function DashboardPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);

  useEffect(() => {
    Promise.all([
      apiRequest<Deal[]>("/api/deals"),
      apiRequest<Account[]>("/api/accounts"),
      apiRequest<Stage[]>("/api/stages")
    ]).then(([dealData, accountData, stageData]) => {
      setDeals(dealData);
      setAccounts(accountData);
      setStages(stageData);
    });
  }, []);

  const totalPipeline = deals.reduce((sum, deal) => sum + (deal.amount ?? 0), 0);

  return (
    <div>
      <h2>Dashboard</h2>
      <div className="cards-grid">
        <div className="detail-panel">
          <div className="card-info">
            <span className="tag">Pipeline</span>
            <strong>${totalPipeline.toLocaleString()}</strong>
            <small>{deals.length} active deals</small>
          </div>
        </div>
        <div className="detail-panel">
          <div className="card-info">
            <span className="tag">Accounts</span>
            <strong>{accounts.length}</strong>
            <small>Tracked companies</small>
          </div>
        </div>
        <div className="detail-panel">
          <div className="card-info">
            <span className="tag">Stages</span>
            <strong>{stages.length}</strong>
            <small>Pipeline stages</small>
          </div>
        </div>
      </div>
    </div>
  );
}
