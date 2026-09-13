import { createRoot } from "react-dom/client";
import LgaWardApp from "./LgaWardApp.jsx";

const mountEl = document.getElementById("lgaWardRoot");
if (mountEl) {
  const root = createRoot(mountEl);
  root.render(<LgaWardApp />);
}
