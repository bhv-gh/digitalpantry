import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Home from "./pages/Home";
import Scan from "./pages/Scan";
import Pantry from "./pages/Pantry";
import AddPantryItem from "./pages/AddPantryItem";
import Shopping from "./pages/Shopping";
import Recipes from "./pages/Recipes";
import Settings from "./pages/Settings";
import useAutoBackup from "./hooks/useAutoBackup";
import RestorePrompt from "./components/RestorePrompt";

export default function App() {
  useAutoBackup();
  return (
    <AppLayout>
      <RestorePrompt />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/pantry" element={<Pantry />} />
        <Route path="/pantry/add" element={<AddPantryItem />} />
        <Route path="/pantry/add/:productId" element={<AddPantryItem />} />
        <Route path="/shopping" element={<Shopping />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
