import React, { lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './renderer/App'
import AppDialogProvider from './renderer/components/AppDialogProvider'
// Character Tracker pages load eagerly: they are the fast path every session opens.
import StatusPage from './renderer/pages/StatusPage'
import SetupPage from './renderer/pages/SetupPage'
import SkillsPage from './renderer/pages/SkillsPage'
import SkillLinePage from './renderer/pages/SkillLinePage'
import EquipmentPage from './renderer/pages/EquipmentPage'
import RotationsPage from './renderer/pages/RotationsPage'
import ConsumablesPage from './renderer/pages/ConsumablesPage'
import CompanionsPage from './renderer/pages/CompanionsPage'
import ChampionPointsPage from './renderer/pages/ChampionPointsPage'
import TipsPage from './renderer/pages/TipsPage'
import ResourcesPage from './renderer/pages/ResourcesPage'
import TraitReferencePage from './renderer/pages/TraitReferencePage'
import HelpHomePage from './renderer/pages/HelpHomePage'
import ThemeGuidePage from './renderer/pages/ThemeGuidePage'
const BuildReferencePage = lazy(() => import('./renderer/pages/BuildReferencePage'))
import SettingsPage from './renderer/pages/SettingsPage'
import CharacterDataPage from './renderer/pages/CharacterDataPage'
// Build Editor is a separate workspace most sessions never open, so it loads on demand.
// These lazy imports split it into its own chunk and keep it out of the startup bundle.
const BuildSetupGuidePage = lazy(() => import('./renderer/pages/BuildSetupGuidePage'))
const BuildEditorImportExportPage = lazy(() => import('./renderer/pages/BuildEditorImportExportPage'))
const BuildLibraryPage = lazy(() => import('./renderer/pages/BuildLibraryPage'))
const NewBuildPage = lazy(() => import('./renderer/pages/NewBuildPage'))
const BuildEquipmentPage = lazy(() => import('./renderer/pages/BuildEquipmentPage'))
const BuildChampionPointsPage = lazy(() => import('./renderer/pages/BuildChampionPointsPage'))
const BuildCompanionsPage = lazy(() => import('./renderer/pages/BuildCompanionsPage'))
const BuildLoadoutsPage = lazy(() => import('./renderer/pages/BuildLoadoutsPage'))
const BuildSkillsPage = lazy(() => import('./renderer/pages/BuildSkillsPage'))
const BuildLevelingPage = lazy(() => import('./renderer/pages/BuildLevelingPage'))
const BuildCharacterSetupPage = lazy(() => import('./renderer/pages/BuildCharacterSetupPage'))
const BuildClassConfigurationPage = lazy(() => import('./renderer/pages/BuildClassConfigurationPage'))
const BuildOverviewPage = lazy(() => import('./renderer/pages/BuildOverviewPage'))
const BuildReviewPage = lazy(() => import('./renderer/pages/BuildReviewPage'))
import './renderer/styles/themes.css'
import './renderer/styles/tokens.css'
import './renderer/styles/global.css'
import './renderer/styles/App.css'
import './renderer/styles/Workspace.css'
import './renderer/styles/ThemeEditor.css'
import './renderer/styles/Character.css'
import './renderer/styles/Help.css'
import './renderer/styles/BuildEditor.css'
import './renderer/styles/Addon.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><AppDialogProvider><HashRouter><Routes><Route path="/" element={<App />}>
    <Route index element={<Navigate to="/setup" replace />} />
    <Route path="status" element={<StatusPage />} /><Route path="setup" element={<SetupPage />} />
    <Route path="skills" element={<SkillsPage />} /><Route path="skills/:lineId" element={<SkillLinePage />} />
    <Route path="equipment" element={<EquipmentPage />} /><Route path="rotations" element={<RotationsPage />} />
    <Route path="champion-points" element={<ChampionPointsPage />} /><Route path="champion-points/:tree" element={<ChampionPointsPage />} />
    <Route path="consumables" element={<ConsumablesPage />} />
    <Route path="companions" element={<CompanionsPage />} />
    <Route path="gameplay-tips" element={<TipsPage />} />
    <Route path="character-data" element={<CharacterDataPage />} />
    <Route path="help" element={<HelpHomePage />} />
    <Route path="help/tips" element={<TipsPage />} />
    <Route path="help/topic/traits" element={<TraitReferencePage />} />
    <Route path="help/topic/:topic" element={<BuildReferencePage />} />
    <Route path="help/guides" element={<BuildSetupGuidePage />} />
    <Route path="help/themes" element={<ThemeGuidePage />} />
    <Route path="help/resources" element={<ResourcesPage />} />
    <Route path="help/settings" element={<Navigate to="/settings?tab=general" replace />} />
    <Route path="help/reference" element={<Navigate to="/help" replace />} />
    <Route path="help/reference/traits" element={<Navigate to="/help/topic/traits" replace />} />
    <Route path="help/reference/:topic" element={<BuildReferencePage />} />
    <Route path="help/traits" element={<Navigate to="/help/topic/traits" replace />} />
    <Route path="help/import-export" element={<Navigate to="/character-data" replace />} />
    <Route path="help/build-setup" element={<Navigate to="/help/guides" replace />} />
    <Route path="tips" element={<Navigate to="/help/tips" replace />} /><Route path="settings" element={<SettingsPage />} />

    <Route path="build-editor" element={<Navigate to="/build-editor/library" replace />} />
    <Route path="build-editor/library" element={<BuildLibraryPage />} />
    <Route path="build-editor/new" element={<NewBuildPage />} />
    <Route path="build-editor/overview" element={<BuildOverviewPage />} />
    <Route path="build-editor/character-setup" element={<BuildCharacterSetupPage />} />
    <Route path="build-editor/class-configuration" element={<BuildClassConfigurationPage />} />
    <Route path="build-editor/skills" element={<BuildSkillsPage />} />
    <Route path="build-editor/leveling" element={<BuildLevelingPage />} />
    <Route path="build-editor/equipment" element={<BuildEquipmentPage />} />
    <Route path="build-editor/champion-points" element={<BuildChampionPointsPage />} />
    <Route path="build-editor/companions" element={<BuildCompanionsPage />} />
    <Route path="build-editor/loadouts" element={<BuildLoadoutsPage />} />
    <Route path="build-editor/review" element={<BuildReviewPage />} />
    <Route path="build-editor/guide" element={<BuildSetupGuidePage />} />
    <Route path="build-editor/import-export" element={<BuildEditorImportExportPage />} />
    <Route path="build-editor/settings" element={<Navigate to="/settings?tab=editor" replace />} />

    <Route path="*" element={<Navigate to="/setup" replace />} />
  </Route></Routes></HashRouter></AppDialogProvider></React.StrictMode>
)
