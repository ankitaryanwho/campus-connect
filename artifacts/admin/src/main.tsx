import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { configureApiClient } from "@workspace/api-client-react";

configureApiClient({ baseUrl: import.meta.env.VITE_API_URL || "" });

createRoot(document.getElementById("root")!).render(<App />);
