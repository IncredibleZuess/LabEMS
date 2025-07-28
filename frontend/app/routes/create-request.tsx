import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router';
import { 
  Calendar,
  Clock,
  Package,
  ArrowLeft,
  Send
} from 'lucide-react';
import { equipmentAPI, requestsAPI } from '../lib/api';
import toast from 'react-hot-toast';

interface Equipment {
  id: number;
  name: string;
  description: string;
  category_id: number;
  category_name: string;
  manufacturer: string;
  model: string;
  available_quantity: number;
  total_quantity: number;
  location: string;
  condition: string;
}

export default function CreateRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    equipmentId: '',
    quantity: 1,
    startDate: '',
    endDate: '',
    purpose: ''
  });

  useEffect(() => {
    if (!user || user.role !== 'student') {
      navigate('/dashboard');
      return;
    }

    const fetchEquipment = async () => {
      try {
        const response = await equipmentAPI.getAll({ available: true });
        setEquipment(response.data.equipment || []);
      } catch (error) {
        console.error('Error fetching equipment:', error);
        toast.error('Failed to load equipment');
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, [user, navigate]);

  const selectedEquipment = equipment.find(eq => eq.id === parseInt(formData.equipmentId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.equipmentId || !formData.startDate || !formData.endDate || !formData.purpose.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      toast.error('End date must be after start date');
      return;
    }

    if (selectedEquipment && formData.quantity > selectedEquipment.available_quantity) {
      toast.error(`Only ${selectedEquipment.available_quantity} units available`);
      return;
    }

    setSubmitting(true);
    try {
      await requestsAPI.create(formData);
      toast.success('Request submitted successfully!');
      navigate('/my-requests');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to submit request';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'equipmentId' ? parseInt(value) || value : value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading equipment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-indigo-600 hover:text-indigo-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Submit Equipment Request</h1>
          <p className="text-gray-600 mt-2">Request laboratory equipment for your projects and research</p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Equipment Selection */}
            <div>
              <label htmlFor="equipmentId" className="block text-sm font-medium text-gray-700 mb-2">
                Select Equipment *
              </label>
              <select
                id="equipmentId"
                name="equipmentId"
                value={formData.equipmentId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Choose equipment...</option>
                {equipment.map(eq => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name} - {eq.manufacturer} {eq.model} (Available: {eq.available_quantity})
                  </option>
                ))}
              </select>
            </div>

            {/* Equipment Details */}
            {selectedEquipment && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-medium text-gray-900 mb-2">Equipment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><span className="font-medium">Category:</span> {selectedEquipment.category_name}</p>
                    <p><span className="font-medium">Location:</span> {selectedEquipment.location}</p>
                    <p><span className="font-medium">Condition:</span> 
                      <span className={`ml-1 px-2 py-1 rounded text-xs ${
                        selectedEquipment.condition === 'excellent' ? 'bg-green-100 text-green-800' :
                        selectedEquipment.condition === 'good' ? 'bg-blue-100 text-blue-800' :
                        selectedEquipment.condition === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedEquipment.condition}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p><span className="font-medium">Available:</span> {selectedEquipment.available_quantity}/{selectedEquipment.total_quantity}</p>
                    <p><span className="font-medium">Description:</span> {selectedEquipment.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                min="1"
                max={selectedEquipment?.available_quantity || 1}
                value={formData.quantity}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-2">
                Purpose *
              </label>
              <textarea
                id="purpose"
                name="purpose"
                rows={4}
                value={formData.purpose}
                onChange={handleInputChange}
                placeholder="Describe the purpose of your equipment request..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
