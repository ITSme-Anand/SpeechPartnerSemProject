/**
 * Grammar Partner — App root with routing.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import NarratePage from './pages/NarratePage';
import ResultPage from './pages/ResultPage';
import DrillGuidePage from './pages/DrillGuidePage';
import DrillConceptPage from './pages/DrillConceptPage';
import DrillMCQPage from './pages/DrillMCQPage';
import DrillScenarioPage from './pages/DrillScenarioPage';
import DrillSummaryPage from './pages/DrillSummaryPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />

            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute><NarratePage /></ProtectedRoute>
            } />
            <Route path="/result/:narrationId" element={
              <ProtectedRoute><ResultPage /></ProtectedRoute>
            } />
            <Route path="/drill-guide/:narrationId" element={
              <ProtectedRoute><DrillGuidePage /></ProtectedRoute>
            } />
            <Route path="/drill/:drillId/concept" element={
              <ProtectedRoute><DrillConceptPage /></ProtectedRoute>
            } />
            <Route path="/drill/:drillId/mcq" element={
              <ProtectedRoute><DrillMCQPage /></ProtectedRoute>
            } />
            <Route path="/drill/:drillId/scenario" element={
              <ProtectedRoute><DrillScenarioPage /></ProtectedRoute>
            } />
            <Route path="/drill/:drillId/summary" element={
              <ProtectedRoute><DrillSummaryPage /></ProtectedRoute>
            } />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
