import { Outlet } from "react-router-dom";

import LeftBar from "./LeftBar";
import TopBar from "./TopBar";

export default function MainLayout() {
  return (
    <div className="main-content">
      {/* LEFT — sidebar (LeftBar renders the .scroll wrapper itself) */}
      <div className="main-content__left">
        <LeftBar />
      </div>

      {/* RIGHT — topbar + page outlet, flush against the sidebar
          (no margin/padding-left — see .main-content__right in globals.css) */}
      <div className="main-content__right">
        <TopBar />

        <main className="os-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
