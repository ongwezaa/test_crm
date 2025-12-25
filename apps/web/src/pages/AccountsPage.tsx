import { useEffect, useState } from "react";
import type { Account } from "@local-crm/shared";
import { apiRequest } from "../api/client";

const emptyForm = {
  name: "",
  industry: "",
  website: "",
  phone: "",
  address: ""
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  const loadAccounts = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    apiRequest<Account[]>(`/api/accounts?${params.toString()}`).then(setAccounts);
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleCreate = async () => {
    await apiRequest<Account>("/api/accounts", {
      method: "POST",
      body: JSON.stringify(form)
    });
    setForm(emptyForm);
    loadAccounts();
  };

  const handleUpdate = async (account: Account) => {
    await apiRequest<Account>(`/api/accounts/${account.id}`, {
      method: "PUT",
      body: JSON.stringify(account)
    });
    loadAccounts();
  };

  const handleDelete = async (id: number) => {
    await apiRequest(`/api/accounts/${id}`, { method: "DELETE" });
    loadAccounts();
  };

  return (
    <div>
      <h2>Accounts</h2>
      <div className="detail-panel" style={{ marginBottom: 16 }}>
        <h3>Create account</h3>
        <div className="form-field">
          <label>Name</label>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </div>
        <div className="form-field">
          <label>Industry</label>
          <input value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} />
        </div>
        <div className="form-field">
          <label>Website</label>
          <input value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} />
        </div>
        <div className="form-field">
          <label>Phone</label>
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        </div>
        <div className="form-field">
          <label>Address</label>
          <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
        </div>
        <button onClick={handleCreate}>Create</button>
      </div>

      <div className="detail-panel" style={{ marginBottom: 16 }}>
        <input placeholder="Search accounts" value={search} onChange={(event) => setSearch(event.target.value)} />
        <button style={{ marginLeft: 8 }} onClick={loadAccounts}>Search</button>
      </div>

      <div className="cards-grid">
        {accounts.map((account) => (
          <div key={account.id} className="detail-panel">
            <div className="form-field">
              <label>Name</label>
              <input
                value={account.name}
                onChange={(event) =>
                  setAccounts((prev) =>
                    prev.map((item) => (item.id === account.id ? { ...item, name: event.target.value } : item))
                  )
                }
              />
            </div>
            <div className="form-field">
              <label>Industry</label>
              <input
                value={account.industry ?? ""}
                onChange={(event) =>
                  setAccounts((prev) =>
                    prev.map((item) => (item.id === account.id ? { ...item, industry: event.target.value } : item))
                  )
                }
              />
            </div>
            <div className="form-field">
              <label>Website</label>
              <input
                value={account.website ?? ""}
                onChange={(event) =>
                  setAccounts((prev) =>
                    prev.map((item) => (item.id === account.id ? { ...item, website: event.target.value } : item))
                  )
                }
              />
            </div>
            <div className="form-field">
              <label>Phone</label>
              <input
                value={account.phone ?? ""}
                onChange={(event) =>
                  setAccounts((prev) =>
                    prev.map((item) => (item.id === account.id ? { ...item, phone: event.target.value } : item))
                  )
                }
              />
            </div>
            <div className="form-field">
              <label>Address</label>
              <input
                value={account.address ?? ""}
                onChange={(event) =>
                  setAccounts((prev) =>
                    prev.map((item) => (item.id === account.id ? { ...item, address: event.target.value } : item))
                  )
                }
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleUpdate(account)}>Save</button>
              <button className="secondary" onClick={() => handleDelete(account.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
