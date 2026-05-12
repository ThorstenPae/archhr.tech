import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import RoleGuard from './components/RoleGuard'
import Sidebar from './components/Sidebar'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import EmployeeDetail from './pages/EmployeeDetail'
import Recruiting from './pages/Recruiting'
import CandidateDetail from './pages/CandidateDetail'
import JobDetail from './pages/JobDetail'
import Onboarding from './pages/Onboarding'
import Absences from './pages/Absences'
import Payroll from './pages/Payroll'
import Performance from './pages/Performance'
import PerformanceCycleDetail from './pages/PerformanceCycleDetail'
import Surveys from './pages/Surveys'
import SurveyDetail from './pages/SurveyDetail'
import Documents from './pages/Documents'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import Whistleblowing from './pages/Whistleblowing'
import WhistleblowingDetail from './pages/WhistleblowingDetail'
import Workflows from './pages/Workflows'
import WorkflowEditor from './pages/WorkflowEditor'

const AM = ['ADMIN', 'MANAGEMENT']
const ALL = ['ADMIN', 'MANAGEMENT', 'EMPLOYEE']

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#0D0D0D]">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}

function P({ allow, children }: { allow: string[]; children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>
        <RoleGuard allow={allow}>{children}</RoleGuard>
      </AppLayout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/"         element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard"                   element={<P allow={ALL}><Dashboard /></P>} />
          <Route path="/employees"                   element={<P allow={AM}><Employees /></P>} />
          <Route path="/employees/:id"               element={<P allow={ALL}><EmployeeDetail /></P>} />
          <Route path="/recruiting"                  element={<P allow={AM}><Recruiting /></P>} />
          <Route path="/recruiting/jobs/:id"         element={<P allow={AM}><JobDetail /></P>} />
          <Route path="/recruiting/candidates/:id"   element={<P allow={AM}><CandidateDetail /></P>} />
          <Route path="/onboarding"                  element={<P allow={AM}><Onboarding /></P>} />
          <Route path="/absences"                    element={<P allow={ALL}><Absences /></P>} />
          <Route path="/payroll"                     element={<P allow={AM}><Payroll /></P>} />
          <Route path="/performance"                 element={<P allow={ALL}><Performance /></P>} />
          <Route path="/performance/:id"             element={<P allow={ALL}><PerformanceCycleDetail /></P>} />
          <Route path="/surveys"                     element={<P allow={ALL}><Surveys /></P>} />
          <Route path="/surveys/:id"                 element={<P allow={ALL}><SurveyDetail /></P>} />
          <Route path="/analytics"                   element={<P allow={AM}><Analytics /></P>} />
          <Route path="/documents"                   element={<P allow={AM}><Documents /></P>} />
          <Route path="/settings"                    element={<P allow={['ADMIN']}><Settings /></P>} />
          <Route path="/whistleblowing"              element={<P allow={AM}><Whistleblowing /></P>} />
          <Route path="/whistleblowing/:id"          element={<P allow={AM}><WhistleblowingDetail /></P>} />
          <Route path="/workflows"                   element={<P allow={AM}><Workflows /></P>} />
          <Route path="/workflows/:id"               element={
            <ProtectedRoute><RoleGuard allow={AM}><WorkflowEditor /></RoleGuard></ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
