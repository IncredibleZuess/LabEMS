import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router';
import { 
  Bell, 
  LogOut, 
  Package, 
  Users, 
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Beaker
} from 'lucide-react';
import { requestsAPI } from '../lib/api';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  overdueRequests: number;
  totalEquipment: number;
  availableEquipment: number;
}

export default function Dashboard() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Don't redirect if authentication is still loading
    if (authLoading) return;
    
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchStats = async () => {
      try {
        if (user.role === 'lecturer' || user.role === 'admin') {
          const response = await requestsAPI.getDashboardStats();
          setStats(response.data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
        toast.error('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, navigate, authLoading]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Show loading spinner while authentication is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Beaker className="h-8 w-8 text-indigo-600" />
              <h1 className="ml-2 text-xl font-semibold text-gray-900">
                Lab EMS
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                Welcome, {user.firstName} {user.lastName}
                <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                  {user.role}
                </span>
              </div>
              
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Bell className="h-5 w-5" />
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600">
            {user.role === 'student' 
              ? 'Submit and track your equipment requests'
              : 'Manage equipment requests and inventory'
            }
          </p>
        </div>

        {/* Stats Grid (for lecturers and admins) */}
        {(user.role === 'lecturer' || user.role === 'admin') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {loading ? '...' : stats?.pendingRequests || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Approved Requests</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {loading ? '...' : stats?.approvedRequests || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Available Equipment</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {loading ? '...' : stats?.availableEquipment || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <XCircle className="h-8 w-8 text-red-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Overdue Returns</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {loading ? '...' : stats?.overdueRequests || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {loading ? '...' : stats?.totalRequests || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-indigo-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Equipment</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {loading ? '...' : stats?.totalEquipment || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {user.role === 'student' && (
            <>
              <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                   onClick={() => navigate('/create-request')}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Submit New Request
                </h3>
                <p className="text-gray-600 mb-4">
                  Request equipment for your projects and research
                </p>
                <button className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700">
                  Create Request
                </button>
              </div>

              <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                   onClick={() => navigate('/my-requests')}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  My Requests
                </h3>
                <p className="text-gray-600 mb-4">
                  View and track your submitted requests
                </p>
                <button className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700">
                  View Requests
                </button>
              </div>

              <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                   onClick={() => navigate('/browse-equipment')}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Browse Equipment
                </h3>
                <p className="text-gray-600 mb-4">
                  Explore available laboratory equipment
                </p>
                <button className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">
                  Browse
                </button>
              </div>
            </>
          )}

          {(user.role === 'lecturer' || user.role === 'admin') && (
            <>
              <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                   onClick={() => navigate('/pending-requests')}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Pending Requests
                </h3>
                <p className="text-gray-600 mb-4">
                  Review and approve student requests
                </p>
                <button className="w-full bg-yellow-600 text-white py-2 px-4 rounded hover:bg-yellow-700">
                  Review Requests
                </button>
              </div>

              <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                   onClick={() => navigate('/manage-equipment')}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Manage Equipment
                </h3>
                <p className="text-gray-600 mb-4">
                  Add, edit, and manage laboratory equipment
                </p>
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
                  Manage Equipment
                </button>
              </div>

              <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                   onClick={() => navigate('/equipment-tracking')}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Equipment Tracking
                </h3>
                <p className="text-gray-600 mb-4">
                  Track active loans and due dates
                </p>
                <button className="w-full bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700">
                  Track Equipment
                </button>
              </div>

              <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Reports
                </h3>
                <p className="text-gray-600 mb-4">
                  Generate usage and inventory reports
                </p>
                <button className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700">
                  View Reports
                </button>
              </div>
            </>
          )}
        </div>

        {/* Recent Activity Placeholder */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-500 text-center py-8">
                Recent activity will be displayed here
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
