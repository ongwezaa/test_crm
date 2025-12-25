import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Account, Deal, Stage } from "@local-crm/shared";
import { apiRequest } from "../api/client";
import { AuthContext } from "../App";

export default function DealsBoardPage() {
  const { user } = useContext(AuthContext);
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<string>("");
  const [filterOwner, setFilterOwner] = useState<string>("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [newDeal, setNewDeal] = useState({
    title: "",
    account_id: "",
    stage_id: "",
    amount: "",
    close_date: ""
  });

  const fetchData = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterStage) params.set("stage_id", filterStage);
    if (filterOwner) params.set("owner_user_id", filterOwner);
    if (dateRange.start) params.set("start_date", dateRange.start);
    if (dateRange.end) params.set("end_date", dateRange.end);
    apiRequest<Deal[]>(`/api/deals?${params.toString()}`).then(setDeals);
    apiRequest<Stage[]>("/api/stages").then(setStages);
    apiRequest<Account[]>("/api/accounts").then(setAccounts);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const groupedDeals = useMemo(() => {
    const map = new Map<number, Deal[]>();
    stages.forEach((stage) => map.set(stage.id, []));
    deals.forEach((deal) => {
      const list = map.get(deal.stage_id) ?? [];
      list.push(deal);
      map.set(deal.stage_id, list);
    });
    return map;
  }, [deals, stages]);

  const handleDrop = async (dealId: number, stageId: number) => {
    setDeals((prev) => prev.map((deal) => (deal.id === dealId ? { ...deal, stage_id: stageId } : deal)));
    try {
      await apiRequest<Deal>(`/api/deals/${dealId}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ stage_id: stageId })
      });
    } catch {
      fetchData();
    }
  };

  const handleCreateDeal = async () => {
    if (!newDeal.title || !newDeal.account_id || !newDeal.stage_id) {
      return;
    }
    await apiRequest<Deal>("/api/deals", {
      method: "POST",
      body: JSON.stringify({
        title: newDeal.title,
        account_id: Number(newDeal.account_id),
        stage_id: Number(newDeal.stage_id),
        amount: Number(newDeal.amount || 0),
        currency: "USD",
        owner_user_id: user?.id ?? 1,
        close_date: newDeal.close_date
      })
    });
    setNewDeal({ title: "", account_id: "", stage_id: "", amount: "", close_date: "" });
    fetchData();
  };

  return (
    <div>
      <h2>Deals Board</h2>
      <div className="detail-panel" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            placeholder="Search deals"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <input
            placeholder="Owner user id"
            value={filterOwner}
            onChange={(event) => setFilterOwner(event.target.value)}
          />
          <select value={filterStage} onChange={(event) => setFilterStage(event.target.value)}>
            <option value="">All stages</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateRange.start}
            onChange={(event) => setDateRange((prev) => ({ ...prev, start: event.target.value }))}
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(event) => setDateRange((prev) => ({ ...prev, end: event.target.value }))}
          />
          <button onClick={fetchData}>Apply</button>
        </div>
      </div>
      <div className="detail-panel" style={{ marginBottom: 16 }}>
        <h3>New deal</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            placeholder="Deal title"
            value={newDeal.title}
            onChange={(event) => setNewDeal((prev) => ({ ...prev, title: event.target.value }))}
          />
          <select
            value={newDeal.account_id}
            onChange={(event) => setNewDeal((prev) => ({ ...prev, account_id: event.target.value }))}
          >
            <option value="">Select account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <select
            value={newDeal.stage_id}
            onChange={(event) => setNewDeal((prev) => ({ ...prev, stage_id: event.target.value }))}
          >
            <option value="">Select stage</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Amount"
            value={newDeal.amount}
            onChange={(event) => setNewDeal((prev) => ({ ...prev, amount: event.target.value }))}
          />
          <input
            type="date"
            value={newDeal.close_date}
            onChange={(event) => setNewDeal((prev) => ({ ...prev, close_date: event.target.value }))}
          />
          <button onClick={handleCreateDeal}>Add deal</button>
        </div>
      </div>
      <div className="board">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className="column"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const dealId = Number(event.dataTransfer.getData("dealId"));
              if (dealId) {
                handleDrop(dealId, stage.id);
              }
            }}
          >
            <h3>{stage.name}</h3>
            {(groupedDeals.get(stage.id) ?? []).map((deal) => (
              <div
                key={deal.id}
                className="card"
                draggable
                onDragStart={(event) => event.dataTransfer.setData("dealId", String(deal.id))}
              >
                <strong>{deal.title}</strong>
                <div>${deal.amount.toLocaleString()}</div>
                <div style={{ marginTop: 6 }}>
                  <Link to={`/deals/${deal.id}`}>View details</Link>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
