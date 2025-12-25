import { useEffect, useState } from "react";
import type { Account, Deal, Stage } from "@local-crm/shared";
import { apiRequest } from "../api/client";

export default function DealsTablePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const loadData = () => {
    Promise.all([
      apiRequest<Deal[]>("/api/deals"),
      apiRequest<Stage[]>("/api/stages"),
      apiRequest<Account[]>("/api/accounts")
    ]).then(([dealData, stageData, accountData]) => {
      setDeals(dealData);
      setStages(stageData);
      setAccounts(accountData);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateDeal = async (updated: Deal) => {
    try {
      await apiRequest<Deal>(`/api/deals/${updated.id}`, {
        method: "PUT",
        body: JSON.stringify(updated)
      });
      setToast("Saved");
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      setToast((err as Error).message);
    }
  };

  const getAccountName = (accountId: number) =>
    accounts.find((account) => account.id === accountId)?.name ?? "-";

  const getDealById = (dealId: number) => deals.find((item) => item.id === dealId);

  return (
    <div>
      <h2>Deals Table</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Deal</th>
            <th>Account</th>
            <th>Amount</th>
            <th>Stage</th>
            <th>Owner</th>
            <th>Close Date</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal, index) => (
            <tr key={deal.id}>
              <td>{deal.title}</td>
              <td>{getAccountName(deal.account_id)}</td>
              <td>
                <input
                  value={deal.amount}
                  onChange={(event) => {
                    const value = Number(event.target.value || 0);
                    setDeals((prev) =>
                      prev.map((item, idx) => (idx === index ? { ...item, amount: value } : item))
                    );
                  }}
                  onBlur={() => {
                    const latest = getDealById(deal.id);
                    if (latest) {
                      updateDeal(latest);
                    }
                  }}
                />
              </td>
              <td>
                <select
                  value={deal.stage_id}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    const nextDeal = { ...deal, stage_id: value };
                    setDeals((prev) => prev.map((item) => (item.id === deal.id ? nextDeal : item)));
                    updateDeal(nextDeal);
                  }}
                >
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  value={deal.owner_user_id}
                  onChange={(event) => {
                    const value = Number(event.target.value || 0);
                    setDeals((prev) =>
                      prev.map((item, idx) => (idx === index ? { ...item, owner_user_id: value } : item))
                    );
                  }}
                  onBlur={() => {
                    const latest = getDealById(deal.id);
                    if (latest) {
                      updateDeal(latest);
                    }
                  }}
                />
              </td>
              <td>
                <input
                  type="date"
                  value={deal.close_date ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDeals((prev) =>
                      prev.map((item, idx) => (idx === index ? { ...item, close_date: value } : item))
                    );
                  }}
                  onBlur={() => {
                    const latest = getDealById(deal.id);
                    if (latest) {
                      updateDeal(latest);
                    }
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
