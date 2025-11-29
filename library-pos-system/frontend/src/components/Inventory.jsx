import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Package, AlertCircle } from 'lucide-react';
import { booksAPI, publishersAPI, transactionsAPI } from '../services/offlineApi';

function Inventory({ books = [], publishers = [], onRefresh }) {  // Add default values
  const [searchTerm, setSearchTerm] = useState('');
  const [showBookForm, setShowBookForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [loading, setLoading] = useState(false);

  const safeBooks = Array.isArray(books) ? books : [];
  const safePublishers = Array.isArray(publishers) ? publishers : [];

  const filteredBooks = safeBooks.filter(book =>
    (book.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (book.author || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (book.isbn || '').toLowerCase().includes(searchTerm.toLowerCase())
  );


  const handleDelete = async (bookId, bookTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${bookTitle}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await booksAPI.delete(bookId);
      alert('Book deleted successfully!');
      onRefresh();
    } catch (error) {
      console.error('Error deleting book:', error);
      alert('Failed to delete book. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (book) => {
    setEditingBook(book);
    setShowBookForm(true);
  };

  const handleAddNew = () => {
    setEditingBook(null);
    setShowBookForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <Package className="text-indigo-600" size={32} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Book Inventory</h1>
              <p className="text-gray-600">Manage your book collection</p>
            </div>
          </div>
          <button 
            onClick={handleAddNew}
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <Plus size={20} />
            <span>Add Book</span>
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="mt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by title, author, or ISBN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-600 text-sm">Total Books</p>
            <p className="text-2xl font-bold text-gray-900">{safeBooks.length}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-gray-600 text-sm">Low Stock</p>
            <p className="text-2xl font-bold text-yellow-600">
              {safeBooks.filter(book => book.stock_qty < 5).length}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-gray-600 text-sm">Total Value</p>
            <p className="text-2xl font-bold text-green-600">
              ${safeBooks.reduce((sum, book) => sum + ((book.stock_qty || 0) * (parseFloat(book.unit_price) || 0)), 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Books Table */}
      {safeBooks.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Package className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No books in inventory</h3>
          <p className="text-gray-500 mb-6">Get started by adding your first book</p>
          <button 
            onClick={handleAddNew}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition inline-flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Add First Book</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-700">
              Showing {filteredBooks.length} of {safeBooks.length} books
            </p>
          </div>
          
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Book Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Publisher
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBooks.map((book) => (
                  <tr key={book.book_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">{book.title}</p>
                        <p className="text-sm text-gray-600">{book.author}</p>
                        <p className="text-xs text-gray-500">ISBN: {book.isbn}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {book.publisher || 'Unknown'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        book.stock_qty < 5 
                          ? 'bg-red-100 text-red-800' 
                          : book.stock_qty < 10
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {book.stock_qty < 5 && <AlertCircle size={14} className="mr-1" />}
                        {book.stock_qty}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      ${parseFloat(book.unit_price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(book)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(book.book_id, book.title)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                          disabled={loading}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Table Footer */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {filteredBooks.length} of {safeBooks.length} books
            </p>
          </div>
        </div>
      )}

      {showBookForm && (
  <BookFormModal
    book={editingBook}
    publishers={publishers}
    onClose={() => {
      setShowBookForm(false);
      setEditingBook(null);
    }}
    onSave={async (formData) => {
    try {
      setLoading(true);
      console.log('Saving book data:', formData); // Debug log
    
      if (editingBook) {
        await booksAPI.update(editingBook.book_id, formData);
        } else {
          await booksAPI.create(formData);
        }
        setShowBookForm(false);
        setEditingBook(null);
        onRefresh();
      } catch (error) {
        console.error('Error saving book:', error);
        console.error('Error response:', error.response?.data);
        alert(`Failed to save book: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
      } finally {
        setLoading(false);
      }
    }}
  />
)}
    </div>
  );
}

// Book Form Modal Component
function BookFormModal({ book, onClose, onSave }) {
  const [formData, setFormData] = useState(
    book || {
      title: '',
      author: '',
      isbn: '',
      stock_qty: 0,
      unit_price: 0,
      pub_id: 1, // Default to first publisher
    }
  );
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPublisherModal, setShowPublisherModal] = useState(false);

  // Load publishers when modal opens
  useEffect(() => {
    loadPublishers();
  }, []);

  const loadPublishers = async () => {
    try {
      // Use the imported API service instead of direct fetch
      const data = await publishersAPI.getAll();
      setPublishers(data);
      
      // Set default publisher if creating new book
      if (!book && data.length > 0) {
        setFormData(prev => ({ ...prev, pub_id: data[0].pub_id }));
      }
    } catch (error) {
      console.error('Error loading publishers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!formData.title || !formData.author || !formData.isbn) {
      alert('Please fill in all required fields');
      return;
    }
    if (!formData.pub_id) {
      alert('Please select a publisher');
      return;
    }
    onSave(formData);
  };

  const handlePublisherChange = (e) => {
    const value = e.target.value;
    if (value === 'new') {
      setShowPublisherModal(true);
    } else {
      setFormData({ ...formData, pub_id: parseInt(value) });
    }
  };

  const handleNewPublisher = async (publisherData) => {
    try {
      const newPublisher = await publishersAPI.create(publisherData);
      await loadPublishers(); // Reload the publishers list
      setFormData({ ...formData, pub_id: newPublisher.pub_id });
      setShowPublisherModal(false);
      alert('Publisher created successfully!');
    } catch (error) {
      console.error('Error creating publisher:', error);
      alert('Failed to create publisher. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (publishers.length === 0 && !showPublisherModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h3 className="text-xl font-bold mb-4 text-red-600">No Publishers Found</h3>
          <p className="mb-4">You need to create at least one publisher before adding books.</p>
          <button
            onClick={() => setShowPublisherModal(true)}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 mb-2"
          >
            Create Publisher
          </button>
          <button
            onClick={onClose}
            className="w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4">{book ? 'Edit Book' : 'Add New Book'}</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publisher *
              </label>
              <select
                value={formData.pub_id}
                onChange={handlePublisherChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Publisher</option>
                {publishers.map(pub => (
                  <option key={pub.pub_id} value={pub.pub_id}>
                    {pub.name}
                  </option>
                ))}
                <option value="new" className="font-semibold text-indigo-600">
                  + Add New Publisher
                </option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter book title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Author *</label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter author name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ISBN *</label>
              <input
                type="text"
                value={formData.isbn}
                onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="978-XXXXXXXXXX"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                <input
                  type="number"
                  value={formData.stock_qty}
                  onChange={(e) => setFormData({ ...formData, stock_qty: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price ($)</label>
                <input
                  type="number"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex space-x-3">
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {book ? 'Update Book' : 'Add Book'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {showPublisherModal && (
        <PublisherModal
          onClose={() => setShowPublisherModal(false)}
          onSave={handleNewPublisher}
        />
      )}
    </>
  );
}

// Publisher Modal Component
function PublisherModal({ onClose, onSave }) {
  const [publisherData, setPublisherData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!publisherData.name) {
      alert('Publisher name is required');
      return;
    }
    onSave(publisherData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Add New Publisher</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Publisher Name *
            </label>
            <input
              type="text"
              value={publisherData.name}
              onChange={(e) => setPublisherData({ ...publisherData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter publisher name"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email (Optional)
            </label>
            <input
              type="email"
              value={publisherData.email}
              onChange={(e) => setPublisherData({ ...publisherData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="publisher@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone (Optional)
            </label>
            <input
              type="tel"
              value={publisherData.phone}
              onChange={(e) => setPublisherData({ ...publisherData, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="+1 (555) 123-4567"
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Create Publisher
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Inventory;