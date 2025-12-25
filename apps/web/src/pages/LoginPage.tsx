import { useState } from "react";
import type { User } from "@local-crm/shared";
import { apiRequest } from "../api/client";

export default function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("admin@localcrm.test");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const user = await apiRequest<User>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      onLogin(user);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Sign in</h2>
        <p>Use the seeded admin credentials to get started.</p>
        <div className="form-field">
          <label>Email</label>
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="form-field">
          <label>Password</label>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        <button type="submit">Login</button>
        {error && <div className="toast">{error}</div>}
      </form>
    </div>
  );
}
