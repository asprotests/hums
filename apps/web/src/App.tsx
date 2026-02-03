import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import {
  Home,
  AdminPortal,
  AcademicPortal,
  StudentPortal,
  StaffPortal,
  FinancePortal,
  LibraryPortal,
} from './pages';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="admin/*" element={<AdminPortal />} />
          <Route path="academic/*" element={<AcademicPortal />} />
          <Route path="student/*" element={<StudentPortal />} />
          <Route path="staff/*" element={<StaffPortal />} />
          <Route path="finance/*" element={<FinancePortal />} />
          <Route path="library/*" element={<LibraryPortal />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
