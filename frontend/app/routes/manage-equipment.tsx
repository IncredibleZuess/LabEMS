import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router';
import { 
  ArrowLeft,
  Search,
  Filter,
  Package,
  Plus,
  Edit,
  Trash2,
  Eye
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
  purchase_price: number;
}

interface Category {
  id: number;
  name: string;
  description: string;
}

export default function ManageEquipment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  useEffect(() => {
    if (!user || (user.role !== 'lecturer' && user.role !== 'admin')) {
      navigate('/dashboard');
      return;
    }

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
  }, [user, navigate]);

  const filteredEquipment = equipment.filter(eq => {
    const matchesSearch = eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         eq.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         eq.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         eq.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         eq.serial_number.toLowerCase().includes(searchTerm.toLowerCase());
    
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

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this equipment? This action cannot be undone.')) {
      return;
    }

    try {
      await equipmentAPI.delete(id.toString());
      setEquipment(prev => prev.filter(eq => eq.id !== id));
      toast.success('Equipment deleted successfully');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to delete equipment';
      toast.error(message);
    }
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
              <h1 className="text-3xl font-bold text-gray-900">Equipment Management</h1>
              <p className="text-gray-600 mt-2">Manage laboratory equipment inventory</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Equipment
            </button>
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

        {/* Equipment Table */}
        {filteredEquipment.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No equipment found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search terms or add new equipment.
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
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Condition
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Availability
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEquipment.map((eq) => (
                    <tr key={eq.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{eq.name}</div>
                          <div className="text-sm text-gray-500">{eq.manufacturer} {eq.model}</div>
                          <div className="text-xs text-gray-400">{eq.serial_number}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {eq.category_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {eq.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getConditionColor(eq.condition)}`}>
                          {eq.condition}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getAvailabilityColor(eq.available_quantity, eq.total_quantity)}`}>
                          {eq.available_quantity}/{eq.total_quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedEquipment(eq)}
                            className="text-gray-600 hover:text-gray-900"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingEquipment(eq)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(eq.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedEquipment.serial_number}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedEquipment.category_name}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Location</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedEquipment.location}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Condition</label>
                      <span className={`mt-1 inline-block px-2 py-1 rounded text-xs font-medium ${getConditionColor(selectedEquipment.condition)}`}>
                        {selectedEquipment.condition}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total Quantity</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedEquipment.total_quantity}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Available</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedEquipment.available_quantity}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEquipment.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Purchase Date</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedEquipment.purchase_date ? new Date(selectedEquipment.purchase_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Purchase Price</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedEquipment.purchase_price ? `$${selectedEquipment.purchase_price.toFixed(2)}` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={() => setSelectedEquipment(null)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setEditingEquipment(selectedEquipment);
                      setSelectedEquipment(null);
                    }}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Equipment Modal would go here - this is a placeholder */}
        {(showAddModal || editingEquipment) && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingEquipment ? 'Edit Equipment' : 'Add New Equipment'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingEquipment(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-md">
                  <p className="text-sm text-yellow-800">
                    Equipment form functionality would be implemented here with full CRUD operations.
                  </p>
                </div>
                
                <div className="mt-6">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingEquipment(null);
                    }}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Close
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
