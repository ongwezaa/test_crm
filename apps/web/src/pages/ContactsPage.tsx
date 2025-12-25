import { useEffect, useState } from "react";
import type { Account, Contact } from "@local-crm/shared";
import { apiRequest } from "../api/client";

const emptyForm = {
  account_id: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  title: ""
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  const loadData = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    apiRequest<Contact[]>(`/api/contacts?${params.toString()}`).then(setContacts);
    apiRequest<Account[]>("/api/accounts").then(setAccounts);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async () => {
    await apiRequest<Contact>("/api/contacts", {
      method: "POST",
      body: JSON.stringify({
        account_id: Number(form.account_id),
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        title: form.title
      })
    });
    setForm(emptyForm);
    loadData();
  };

  const handleDelete = async (id: number) => {
    await apiRequest(`/api/contacts/${id}`, { method: "DELETE" });
    loadData();
  };

  const getAccountName = (accountId: number) =>
    accounts.find((account) => account.id === accountId)?.name ?? "-";

  return (
    <div>
      <h2>Contacts</h2>
      <div className="detail-panel" style={{ marginBottom: 16 }}>
        <h3>Create contact</h3>
        <div className="form-field">
          <label>Account</label>
          <select value={form.account_id} onChange={(event) => setForm({ ...form, account_id: event.target.value })}>
            <option value="">Select account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>First name</label>
          <input value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} />
        </div>
        <div className="form-field">
          <label>Last name</label>
          <input value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} />
        </div>
        <div className="form-field">
          <label>Email</label>
          <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </div>
        <div className="form-field">
          <label>Phone</label>
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        </div>
        <div className="form-field">
          <label>Title</label>
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </div>
        <button onClick={handleCreate}>Create</button>
      </div>

      <div className="detail-panel" style={{ marginBottom: 16 }}>
        <input placeholder="Search contacts" value={search} onChange={(event) => setSearch(event.target.value)} />
        <button style={{ marginLeft: 8 }} onClick={loadData}>Search</button>
      </div>

      <div className="cards-grid">
        {contacts.map((contact) => (
          <div key={contact.id} className="detail-panel">
            <strong>
              {contact.first_name} {contact.last_name}
            </strong>
            <div>{contact.email}</div>
            <div>{contact.phone}</div>
            <div>{contact.title}</div>
            <div className="badge">{getAccountName(contact.account_id)}</div>
            <button className="secondary" onClick={() => handleDelete(contact.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
