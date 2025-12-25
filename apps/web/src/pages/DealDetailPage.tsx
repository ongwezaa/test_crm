import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Account, Activity, Contact, Deal, Note, Stage } from "@local-crm/shared";
import { apiRequest } from "../api/client";
import { AuthContext } from "../App";

export default function DealDetailPage() {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const dealId = Number(id);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [activityForm, setActivityForm] = useState({ type: "call", subject: "", due_date: "", status: "open" });
  const [noteBody, setNoteBody] = useState("");

  const loadData = async () => {
    const dealData = await apiRequest<Deal>(`/api/deals/${dealId}`);
    setDeal(dealData);
    const [accountData, contactData, activityData, noteData, stageData] = await Promise.all([
      apiRequest<Account[]>("/api/accounts"),
      apiRequest<Contact[]>(`/api/contacts?account_id=${dealData.account_id}`),
      apiRequest<Activity[]>(`/api/activities?deal_id=${dealId}`),
      apiRequest<Note[]>(`/api/notes?deal_id=${dealId}`),
      apiRequest<Stage[]>("/api/stages")
    ]);
    setAccount(accountData.find((item) => item.id === dealData.account_id) ?? null);
    setContacts(contactData);
    setActivities(activityData);
    setNotes(noteData);
    setStages(stageData);
  };

  useEffect(() => {
    loadData();
  }, [dealId]);

  if (!deal) {
    return <div className="loading">Loading deal...</div>;
  }

  const stageName = stages.find((stage) => stage.id === deal.stage_id)?.name ?? "-";

  const handleAddActivity = async () => {
    await apiRequest<Activity>("/api/activities", {
      method: "POST",
      body: JSON.stringify({
        deal_id: dealId,
        type: activityForm.type,
        subject: activityForm.subject,
        due_date: activityForm.due_date,
        status: activityForm.status,
        assigned_user_id: deal.owner_user_id
      })
    });
    setActivityForm({ type: "call", subject: "", due_date: "", status: "open" });
    loadData();
  };

  const handleAddNote = async () => {
    await apiRequest<Note>("/api/notes", {
      method: "POST",
      body: JSON.stringify({
        deal_id: dealId,
        author_user_id: user?.id ?? deal.owner_user_id,
        body: noteBody
      })
    });
    setNoteBody("");
    loadData();
  };

  return (
    <div>
      <h2>{deal.title}</h2>
      <div className="detail-layout">
        <div className="detail-panel">
          <h3>Summary</h3>
          <p><strong>Account:</strong> {account?.name ?? "-"}</p>
          <p><strong>Stage:</strong> {stageName}</p>
          <p><strong>Amount:</strong> ${deal.amount.toLocaleString()}</p>
          <p><strong>Close date:</strong> {deal.close_date ?? "-"}</p>
          <h4>Contacts</h4>
          {contacts.map((contact) => (
            <div key={contact.id}>
              {contact.first_name} {contact.last_name} · {contact.title}
            </div>
          ))}
        </div>
        <div className="detail-panel">
          <h3>Activities</h3>
          {activities.map((activity) => (
            <div key={activity.id} style={{ marginBottom: 8 }}>
              <strong>{activity.subject}</strong> · {activity.type} · {activity.status}
            </div>
          ))}
          <h4>Quick add</h4>
          <div className="form-field">
            <label>Type</label>
            <select
              value={activityForm.type}
              onChange={(event) => setActivityForm({ ...activityForm, type: event.target.value })}
            >
              <option value="call">Call</option>
              <option value="meeting">Meeting</option>
              <option value="email">Email</option>
              <option value="follow-up">Follow-up</option>
            </select>
          </div>
          <div className="form-field">
            <label>Subject</label>
            <input
              value={activityForm.subject}
              onChange={(event) => setActivityForm({ ...activityForm, subject: event.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Due date</label>
            <input
              type="date"
              value={activityForm.due_date}
              onChange={(event) => setActivityForm({ ...activityForm, due_date: event.target.value })}
            />
          </div>
          <button onClick={handleAddActivity}>Add activity</button>
        </div>
      </div>
      <div className="detail-panel" style={{ marginTop: 24 }}>
        <h3>Notes</h3>
        {notes.map((note) => (
          <div key={note.id} style={{ marginBottom: 8 }}>
            <div>{note.body}</div>
            <small>{note.created_at}</small>
          </div>
        ))}
        <div className="form-field">
          <label>New note</label>
          <textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} />
        </div>
        <button onClick={handleAddNote}>Add note</button>
      </div>
    </div>
  );
}
