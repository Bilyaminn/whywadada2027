import { createRoot } from "react-dom/client";
import SupportersApp from "./SupportersApp.jsx";

const mountEl = document.getElementById("supportersRoot");
if (mountEl) {
  const root = createRoot(mountEl);
  root.render(<SupportersApp />);
}
