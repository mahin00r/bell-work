import { createRoot } from 'react-dom/client';
import { Dashboard } from '../../features/dashboard/Dashboard';
import '../../ui/tokens.css';
import '../../features/today/today.css';
import '../../features/dashboard/dashboard.css';
import '../../features/dashboard/planning.css';
createRoot(document.getElementById('root')!).render(<Dashboard />);
