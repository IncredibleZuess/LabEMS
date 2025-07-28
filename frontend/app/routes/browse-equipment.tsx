import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router';
import { 
  ArrowLeft,
  Search,
  Filter,
  Package,
  MapPin,
  Calendar,
  Eye,
  Plus
} from 'lucide-react';
import { equipmentAPI } from '../lib/api';
import toast from 'react-hot-toast';

interface Equipment {
  id: number;
  name: string;
  description: string;
  category_id: number;
  category_name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  available_quantity: number;
  total_quantity: number;
  location: string;
  condition: string;
  purchase_date: string;
}

interface Category {
  id: number;
  name: string;
  description: string;
}

export default function BrowseEquipment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [equipmentResponse, categoriesResponse] = await Promise.all([
          equipmentAPI.getAll(),
          equipmentAPI.getCategories()
        ]);
        
        setEquipment(equipmentResponse.data.equipment || []);
        setCategories(categoriesResponse.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load equipment data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredEquipment = equipment.filter(eq => {
    const matchesSearch = eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         eq.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         eq.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         eq.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || eq.category_id.toString() === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-orange-100 text-orange-800';
      case 'damaged': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAvailabilityColor = (available: number, total: number) => {
    const percentage = (available / total) * 100;
    if (percentage === 0) return 'bg-red-100 text-red-800';
    if (percentage <= 25) return 'bg-orange-100 text-orange-800';
    if (percentage <= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
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
              <h1 className="text-3xl font-bold text-gray-900">Equipment Catalog</h1>
              <p className="text-gray-600 mt-2">Browse available laboratory equipment</p>
            </div>
            {user?.role === 'student' && (
              <button
                onClick={() => navigate('/create-request')}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Request Equipment
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Equipment Grid */}
        {filteredEquipment.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No equipment found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search terms or filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEquipment.map((eq) => (
              <div key={eq.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{eq.name}</h3>
                    <button
                      onClick={() => setSelectedEquipment(eq)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-600">{eq.manufacturer} {eq.model}</p>
                    <p className="text-sm text-gray-500">{eq.category_name}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-1" />
                      {eq.location}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getConditionColor(eq.condition)}`}>
                      {eq.condition}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getAvailabilityColor(eq.available_quantity, eq.total_quantity)}`}>
                      {eq.available_quantity}/{eq.total_quantity} available
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    {eq.description.length > 100 
                      ? `${eq.description.substring(0, 100)}...`
                      : eq.description
                    }
                  </p>

                  {user?.role === 'student' && eq.available_quantity > 0 && (
                    <button
                      onClick={() => navigate('/create-request', { 
                        state: { selectedEquipmentId: eq.id } 
                      })}
                      className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 text-sm"
                    >
                      Request This Item
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Equipment Details Modal */}
        {selectedEquipment && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Equipment Details</h3>
                  <button
                    onClick={() => setSelectedEquipment(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEquipment.name}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Manufacturer</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedEquipment.manufacturer}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Model</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedEquipment.model}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEquipment.category_name}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedEquipment.serial_number}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Location</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedEquipment.location}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Condition</label>
                      <span className={`mt-1 inline-block px-2 py-1 rounded text-xs font-medium ${getConditionColor(selectedEquipment.condition)}`}>
                        {selectedEquipment.condition}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Availability</label>
                      <span className={`mt-1 inline-block px-2 py-1 rounded text-xs font-medium ${getAvailabilityColor(selectedEquipment.available_quantity, selectedEquipment.total_quantity)}`}>
                        {selectedEquipment.available_quantity}/{selectedEquipment.total_quantity}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEquipment.description}</p>
                  </div>
                </div>
                
                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={() => setSelectedEquipment(null)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Close
                  </button>
                  {user?.role === 'student' && selectedEquipment.available_quantity > 0 && (
                    <button
                      onClick={() => {
                        setSelectedEquipment(null);
                        navigate('/create-request', { 
                          state: { selectedEquipmentId: selectedEquipment.id } 
                        });
                      }}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Request
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
