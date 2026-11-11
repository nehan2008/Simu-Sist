import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/Layout';
import ExperimentLibrary from './pages/ExperimentLibrary';
import ExperimentPage from './pages/ExperimentPage';
import SubjectPage from './pages/SubjectPage';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<ExperimentLibrary />} />
          <Route path="experiments/:id" element={<ExperimentPage />} />
          <Route
            path="subjects/physics"
            element={<SubjectPage subject="physics" title="Physics" />}
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
