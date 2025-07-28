import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router';
import { 
  ArrowLeft,
  Search,
  Filter,
  Package,
  User,
  Calendar,
  Clock,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { equipmentAPI, requestsAPI } from '../lib/api';
import toast from 'react-hot-toast';
import { format, differenceInDays, isAfter } from 'date-fns';

interface ActiveLoan {
  id: number;
  equipment_id: number;
  equipment_name: string;
  equipment_manufacturer: string;
  equipment_model: string;
  equipment_location: string;
  user_id: number;
  student_name: string;
  student_email: string;
  student_number: string;
  quantity: number;
  start_date: string;
  end_date: string;
  purpose: string;
  approved_at: string;
  lecturer_name: string;
  days_remaining: number;
  is_overdue: boolean;
}

interface Category {
  id: number;
  name: string;
}

export default function EquipmentTracking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<ActiveLoan | null>(null);

  useEffect(() => {
    if (!user || (user.role !== 'lecturer' && user.role !== 'admin')) {
      navigate('/dashboard');
      return;
    }

    const fetchData = async () => {
      try {
        const [loansResponse, categoriesResponse] = await Promise.all([
          requestsAPI.getActiveLoans(),
          equipmentAPI.getCategories()
        ]);
        
        // Process active loans data
        const loans = loansResponse.data.requests || [];
        const processedLoans = loans.map((loan: any) => {
          const endDate = new Date(loan.end_date);
          const today = new Date();
          const daysRemaining = differenceInDays(endDate, today);
          const isOverdue = isAfter(today, endDate);
          
          return {
            ...loan,
            days_remaining: daysRemaining,
            is_overdue: isOverdue
          };
        });
        
        setActiveLoans(processedLoans);
        setCategories(categoriesResponse.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load equipment tracking data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  const filteredLoans = activeLoans.filter(loan => {
    const matchesSearch = loan.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         loan.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         loan.student_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         loan.equipment_manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    
    // For category filtering, we'd need to add category info to the loan data
    return matchesSearch;
  });

  const getDaysRemainingColor = (daysRemaining: number, isOverdue: boolean) => {
    if (isOverdue) return 'bg-red-100 text-red-800';
    if (daysRemaining <= 1) return 'bg-orange-100 text-orange-800';
    if (daysRemaining <= 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const handleReturnEquipment = async (loanId: number) => {
    if (!confirm('Mark this equipment as returned?')) return;

    try {
      await requestsAPI.markAsReturned(loanId.toString(), {
        return_date: new Date().toISOString(),
        condition_after: 'good' // Could be made configurable
      });
      
      // Remove from active loans
      setActiveLoans(prev => prev.filter(loan => loan.id !== loanId));
      toast.success('Equipment marked as returned');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to mark equipment as returned';
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading equipment tracking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-indigo-600 hover:text-indigo-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Equipment Tracking</h1>
              <p className="text-gray-600 mt-2">Monitor active equipment loans and due dates</p>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active Loans</p>
                <p className="text-2xl font-semibold text-gray-900">{activeLoans.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {activeLoans.filter(loan => loan.is_overdue).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Due Soon</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {activeLoans.filter(loan => !loan.is_overdue && loan.days_remaining <= 3).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <User className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active Students</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {new Set(activeLoans.map(loan => loan.user_id)).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by equipment name, student name, or student number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Active Loans Table */}
        {filteredLoans.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No active loans found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'All equipment is currently available.'}
            </p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Equipment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loan Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{loan.equipment_name}</div>
                          <div className="text-sm text-gray-500">
                            {loan.equipment_manufacturer} {loan.equipment_model}
                          </div>
                          <div className="text-xs text-gray-400">
                            Qty: {loan.quantity} • Location: {loan.equipment_location}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{loan.student_name}</div>
                          <div className="text-sm text-gray-500">{loan.student_number}</div>
                          <div className="text-xs text-gray-400">{loan.student_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">
                            {format(new Date(loan.start_date), 'MMM dd')} - {format(new Date(loan.end_date), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-xs text-gray-500">
                            Approved: {format(new Date(loan.approved_at), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getDaysRemainingColor(loan.days_remaining, loan.is_overdue)}`}>
                          {loan.is_overdue 
                            ? `${Math.abs(loan.days_remaining)} days overdue`
                            : loan.days_remaining === 0 
                              ? 'Due today'
                              : `${loan.days_remaining} days left`
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedLoan(loan)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleReturnEquipment(loan.id)}
                            className="text-green-600 hover:text-green-900 text-xs px-2 py-1 border border-green-300 rounded"
                            title="Mark as Returned"
                          >
                            Return
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Loan Details Modal */}
        {selectedLoan && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Loan Details</h3>
                  <button
                    onClick={() => setSelectedLoan(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Equipment</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedLoan.equipment_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedLoan.equipment_manufacturer} {selectedLoan.equipment_model}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Quantity</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedLoan.quantity}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Location</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedLoan.equipment_location}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Student</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedLoan.student_name} ({selectedLoan.student_number})
                    </p>
                    <p className="text-xs text-gray-500">{selectedLoan.student_email}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Loan Period</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {format(new Date(selectedLoan.start_date), 'MMMM dd, yyyy')} - {format(new Date(selectedLoan.end_date), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`mt-1 inline-block px-2 py-1 rounded text-xs font-medium ${getDaysRemainingColor(selectedLoan.days_remaining, selectedLoan.is_overdue)}`}>
                      {selectedLoan.is_overdue 
                        ? `${Math.abs(selectedLoan.days_remaining)} days overdue`
                        : selectedLoan.days_remaining === 0 
                          ? 'Due today'
                          : `${selectedLoan.days_remaining} days remaining`
                      }
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Purpose</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLoan.purpose}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Approved By</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLoan.lecturer_name}</p>
                    <p className="text-xs text-gray-500">
                      on {format(new Date(selectedLoan.approved_at), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={() => setSelectedLoan(null)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleReturnEquipment(selectedLoan.id);
                      setSelectedLoan(null);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Mark as Returned
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
