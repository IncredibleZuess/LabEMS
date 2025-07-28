import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router';
import { 
  ArrowLeft,
  Calendar,
  Clock,
  Package,
  CheckCircle,
  XCircle,
  User,
  Eye,
  Check,
  X
} from 'lucide-react';
import { requestsAPI } from '../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Request {
  id: number;
  user_id: number;
  student_name: string;
  student_email: string;
  student_number: string;
  equipment_id: number;
  equipment_name: string;
  equipment_manufacturer: string;
  equipment_model: string;
  quantity: number;
  start_date: string;
  end_date: string;
  purpose: string;
  status: 'pending' | 'approved' | 'denied' | 'returned' | 'overdue';
  request_date: string;
  lecturer_notes?: string;
}

export default function PendingRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [reviewModal, setReviewModal] = useState<{ request: Request; action: 'approve' | 'deny' } | null>(null);
  const [lecturerNotes, setLecturerNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user || (user.role !== 'lecturer' && user.role !== 'admin')) {
      navigate('/dashboard');
      return;
    }

    const fetchRequests = async () => {
      try {
        const response = await requestsAPI.getAll({ status: 'pending' });
        setRequests(response.data.requests || []);
      } catch (error) {
        console.error('Error fetching requests:', error);
        toast.error('Failed to load requests');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user, navigate]);

  const handleReview = async (action: 'approve' | 'deny') => {
    if (!reviewModal) return;

    setProcessing(true);
    try {
      await requestsAPI.updateStatus(reviewModal.request.id.toString(), {
        status: action === 'approve' ? 'approved' : 'denied',
        lecturer_notes: lecturerNotes.trim() || undefined
      });

      toast.success(`Request ${action === 'approve' ? 'approved' : 'denied'} successfully`);
      
      // Remove the request from the list
      setRequests(prev => prev.filter(r => r.id !== reviewModal.request.id));
      setReviewModal(null);
      setLecturerNotes('');
    } catch (error: any) {
      const message = error.response?.data?.error || `Failed to ${action} request`;
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-indigo-600 hover:text-indigo-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Pending Equipment Requests</h1>
          <p className="text-gray-600 mt-2">Review and approve student equipment requests</p>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <Clock className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No pending requests</h3>
            <p className="mt-1 text-sm text-gray-500">
              All equipment requests have been reviewed.
            </p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {requests.map((request) => (
                <li key={request.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div>
                          <p className="text-sm font-medium text-indigo-600">
                            {request.equipment_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {request.equipment_manufacturer} {request.equipment_model}
                          </p>
                        </div>
                        <span className="ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </span>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex space-x-2">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="text-gray-400 hover:text-gray-600"
                          title="View Details"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setReviewModal({ request, action: 'approve' })}
                          className="text-green-600 hover:text-green-800"
                          title="Approve"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setReviewModal({ request, action: 'deny' })}
                          className="text-red-600 hover:text-red-800"
                          title="Deny"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          <User className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {request.student_name} ({request.student_number})
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                          <Package className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          Quantity: {request.quantity}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {format(new Date(request.start_date), 'MMM dd')} - {format(new Date(request.end_date), 'MMM dd, yyyy')}
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Purpose:</span> {request.purpose.length > 100 
                          ? `${request.purpose.substring(0, 100)}...`
                          : request.purpose
                        }
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Request Details Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Request Details</h3>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Student</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedRequest.student_name} ({selectedRequest.student_number})
                    </p>
                    <p className="text-xs text-gray-500">{selectedRequest.student_email}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Equipment</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedRequest.equipment_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedRequest.equipment_manufacturer} {selectedRequest.equipment_model}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Quantity</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.quantity}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Requested</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {format(new Date(selectedRequest.request_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Period</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {format(new Date(selectedRequest.start_date), 'MMM dd, yyyy')} - {format(new Date(selectedRequest.end_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Purpose</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.purpose}</p>
                  </div>
                </div>
                
                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRequest(null);
                      setReviewModal({ request: selectedRequest, action: 'approve' });
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRequest(null);
                      setReviewModal({ request: selectedRequest, action: 'deny' });
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Deny
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {reviewModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {reviewModal.action === 'approve' ? 'Approve' : 'Deny'} Request
                  </h3>
                  <button
                    onClick={() => {
                      setReviewModal(null);
                      setLecturerNotes('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Student:</span> {reviewModal.request.student_name}
                    </p>
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Equipment:</span> {reviewModal.request.equipment_name}
                    </p>
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Quantity:</span> {reviewModal.request.quantity}
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="lecturer_notes" className="block text-sm font-medium text-gray-700 mb-2">
                      Notes {reviewModal.action === 'deny' ? '(Required)' : '(Optional)'}
                    </label>
                    <textarea
                      id="lecturer_notes"
                      rows={3}
                      value={lecturerNotes}
                      onChange={(e) => setLecturerNotes(e.target.value)}
                      placeholder={
                        reviewModal.action === 'approve' 
                          ? "Add any notes for the student..."
                          : "Please provide a reason for denial..."
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required={reviewModal.action === 'deny'}
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={() => {
                      setReviewModal(null);
                      setLecturerNotes('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    disabled={processing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleReview(reviewModal.action)}
                    disabled={processing || (reviewModal.action === 'deny' && !lecturerNotes.trim())}
                    className={`flex-1 px-4 py-2 text-white rounded-md disabled:opacity-50 ${
                      reviewModal.action === 'approve' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {processing ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      reviewModal.action === 'approve' ? 'Approve' : 'Deny'
                    )}
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
