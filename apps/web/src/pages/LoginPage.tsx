import { useState } from "react";
import type { User } from "@local-crm/shared";

export default function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("admin@localcrm.test");
  const [password, setPassword] = useState("admin123");
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onLogin({
      id: 1,
      email,
      name: email.split("@")[0] || "Demo User"
    });
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
      </form>
    </div>
  );
}
