import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './renderer/App'
import StatusPage from './renderer/pages/StatusPage'
import SetupPage from './renderer/pages/SetupPage'
import SkillsPage from './renderer/pages/SkillsPage'
import SkillLinePage from './renderer/pages/SkillLinePage'
import EquipmentPage from './renderer/pages/EquipmentPage'
import RotationsPage from './renderer/pages/RotationsPage'
import ConsumablesPage from './renderer/pages/ConsumablesPage'
import ChampionPointsPage from './renderer/pages/ChampionPointsPage'
import TipsPage from './renderer/pages/TipsPage'
import ImportExportPage from './renderer/pages/ImportExportPage'
import ResourcesPage from './renderer/pages/ResourcesPage'
import SettingsPage from './renderer/pages/SettingsPage'
import './renderer/styles/global.css'
import './renderer/styles/App.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><HashRouter><Routes><Route path="/" element={<App />}>
    <Route index element={<Navigate to="/setup" replace />} />
    <Route path="status" element={<StatusPage />} /><Route path="setup" element={<SetupPage />} />
    <Route path="skills" element={<SkillsPage />} /><Route path="skills/:lineId" element={<SkillLinePage />} />
    <Route path="equipment" element={<EquipmentPage />} /><Route path="rotations" element={<RotationsPage />} />
    <Route path="champion-points" element={<ChampionPointsPage />} /><Route path="champion-points/:tree" element={<ChampionPointsPage />} />
    <Route path="consumables" element={<ConsumablesPage />} />
    <Route path="help/tips" element={<TipsPage />} /><Route path="help/import-export" element={<ImportExportPage />} /><Route path="help/resources" element={<ResourcesPage />} />
    <Route path="tips" element={<Navigate to="/help/tips" replace />} /><Route path="settings" element={<SettingsPage />} />
    <Route path="*" element={<Navigate to="/setup" replace />} />
  </Route></Routes></HashRouter></React.StrictMode>
)
