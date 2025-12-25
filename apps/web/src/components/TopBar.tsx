import type { User } from "@local-crm/shared";

export default function TopBar({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="topbar">
      <div>
        <strong>Welcome back, {user.name}</strong>
      </div>
      <button className="secondary" onClick={onLogout}>Log out</button>
    </div>
  );
}
