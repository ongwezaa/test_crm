import { useEffect, useState } from "react";
import type { Stage } from "@local-crm/shared";
import { apiRequest } from "../api/client";

const emptyStage = { name: "", order_index: "", is_won: false, is_lost: false };

export default function SettingsPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [form, setForm] = useState(emptyStage);

  const loadStages = () => {
    apiRequest<Stage[]>("/api/stages").then(setStages);
  };

  useEffect(() => {
    loadStages();
  }, []);

  const handleCreate = async () => {
    await apiRequest<Stage>("/api/stages", {
      method: "POST",
      body: JSON.stringify({
        name: form.name,
        order_index: Number(form.order_index),
        is_won: form.is_won ? 1 : 0,
        is_lost: form.is_lost ? 1 : 0
      })
    });
    setForm(emptyStage);
    loadStages();
  };

  const handleUpdate = async (stage: Stage) => {
    await apiRequest<Stage>(`/api/stages/${stage.id}`, {
      method: "PUT",
      body: JSON.stringify(stage)
    });
    loadStages();
  };

  const handleDelete = async (id: number) => {
    await apiRequest(`/api/stages/${id}`, { method: "DELETE" });
    loadStages();
  };

  return (
    <div>
      <h2>Settings</h2>
      <div className="detail-panel" style={{ marginBottom: 16 }}>
        <h3>Add stage</h3>
        <div className="form-field">
          <label>Name</label>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </div>
        <div className="form-field">
          <label>Order</label>
          <input value={form.order_index} onChange={(event) => setForm({ ...form, order_index: event.target.value })} />
        </div>
        <div className="form-field">
          <label>
            <input
              type="checkbox"
              checked={form.is_won}
              onChange={(event) => setForm({ ...form, is_won: event.target.checked })}
            />
            Won stage
          </label>
        </div>
        <div className="form-field">
          <label>
            <input
              type="checkbox"
              checked={form.is_lost}
              onChange={(event) => setForm({ ...form, is_lost: event.target.checked })}
            />
            Lost stage
          </label>
        </div>
        <button onClick={handleCreate}>Add stage</button>
      </div>

      <div className="cards-grid">
        {stages.map((stage) => (
          <div key={stage.id} className="detail-panel">
            <div className="form-field">
              <label>Name</label>
              <input
                value={stage.name}
                onChange={(event) =>
                  setStages((prev) => prev.map((item) => (item.id === stage.id ? { ...item, name: event.target.value } : item)))
                }
              />
            </div>
            <div className="form-field">
              <label>Order</label>
              <input
                value={stage.order_index}
                onChange={(event) =>
                  setStages((prev) =>
                    prev.map((item) =>
                      item.id === stage.id ? { ...item, order_index: Number(event.target.value || 0) } : item
                    )
                  )
                }
              />
            </div>
            <div className="form-field">
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(stage.is_won)}
                  onChange={(event) =>
                    setStages((prev) =>
                      prev.map((item) => (item.id === stage.id ? { ...item, is_won: event.target.checked ? 1 : 0 } : item))
                    )
                  }
                />
                Won
              </label>
            </div>
            <div className="form-field">
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(stage.is_lost)}
                  onChange={(event) =>
                    setStages((prev) =>
                      prev.map((item) => (item.id === stage.id ? { ...item, is_lost: event.target.checked ? 1 : 0 } : item))
                    )
                  }
                />
                Lost
              </label>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleUpdate(stage)}>Save</button>
              <button className="secondary" onClick={() => handleDelete(stage.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
