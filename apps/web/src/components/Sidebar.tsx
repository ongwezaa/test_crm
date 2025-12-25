import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/deals/board", label: "Deals Board" },
  { to: "/deals/table", label: "Deals Table" },
  { to: "/accounts", label: "Accounts" },
  { to: "/contacts", label: "Contacts" },
  { to: "/activities", label: "Activities" },
  { to: "/settings", label: "Settings" }
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <h1>Local CRM</h1>
      <nav>
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "active" : "")}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
