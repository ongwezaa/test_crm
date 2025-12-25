import { useContext, useEffect, useState } from "react";
import type { Activity, Deal } from "@local-crm/shared";
import { apiRequest } from "../api/client";
import { AuthContext } from "../App";

const emptyForm = {
  deal_id: "",
  type: "call",
  subject: "",
  due_date: "",
  status: "open",
  assigned_user_id: ""
};

export default function ActivitiesPage() {
  const { user } = useContext(AuthContext);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [form, setForm] = useState(emptyForm);

  const loadData = () => {
    apiRequest<Activity[]>("/api/activities").then(setActivities);
    apiRequest<Deal[]>("/api/deals").then(setDeals);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (user?.id && !form.assigned_user_id) {
      setForm((prev) => ({ ...prev, assigned_user_id: String(user.id) }));
    }
  }, [user, form.assigned_user_id]);

  const handleCreate = async () => {
    await apiRequest<Activity>("/api/activities", {
      method: "POST",
      body: JSON.stringify({
        deal_id: Number(form.deal_id),
        type: form.type,
        subject: form.subject,
        due_date: form.due_date,
        status: form.status,
        assigned_user_id: Number(form.assigned_user_id || user?.id)
      })
    });
    setForm(emptyForm);
    loadData();
  };

  const handleDelete = async (id: number) => {
    await apiRequest(`/api/activities/${id}`, { method: "DELETE" });
    loadData();
  };

  const getDealTitle = (dealId: number) => deals.find((deal) => deal.id === dealId)?.title ?? "-";

  return (
    <div>
      <h2>Activities</h2>
      <div className="detail-panel" style={{ marginBottom: 16 }}>
        <h3>Create activity</h3>
        <div className="form-field">
          <label>Deal</label>
          <select value={form.deal_id} onChange={(event) => setForm({ ...form, deal_id: event.target.value })}>
            <option value="">Select deal</option>
            {deals.map((deal) => (
              <option key={deal.id} value={deal.id}>
                {deal.title}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Type</label>
          <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
            <option value="call">Call</option>
            <option value="meeting">Meeting</option>
            <option value="email">Email</option>
            <option value="follow-up">Follow-up</option>
          </select>
        </div>
        <div className="form-field">
          <label>Subject</label>
          <input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} />
        </div>
        <div className="form-field">
          <label>Due date</label>
          <input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} />
        </div>
        <div className="form-field">
          <label>Status</label>
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option value="open">Open</option>
            <option value="done">Done</option>
          </select>
        </div>
        <button onClick={handleCreate}>Create</button>
      </div>

      <div className="cards-grid">
        {activities.map((activity) => (
          <div key={activity.id} className="detail-panel">
            <strong>{activity.subject}</strong>
            <div className="badge">{activity.type}</div>
            <div>Deal: {getDealTitle(activity.deal_id)}</div>
            <div>Status: {activity.status}</div>
            <div>Due: {activity.due_date ?? "-"}</div>
            <button className="secondary" onClick={() => handleDelete(activity.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
