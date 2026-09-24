import AdminPanel from './admin/AdminPanel.jsx';
import App from './App.jsx';

function RootPage() {
  return window.location.pathname.startsWith('/admin') ? <AdminPanel /> : <App />;
}

export default RootPage;
