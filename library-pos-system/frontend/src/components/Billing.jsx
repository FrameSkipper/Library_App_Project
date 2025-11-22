import React, { useState } from 'react';
import { Search, ShoppingCart, X, Plus, Minus, CreditCard, Printer } from 'lucide-react';
import { transactionsAPI } from '../services/api';

function Billing({ books = [], onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);

  const safeBooks = Array.isArray(books) ? books : [];

  const filteredBooks = safeBooks.filter(book =>
    (book.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (book.author || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (book.isbn || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (book) => {
    if (book.stock_qty === 0) {
      alert('This book is out of stock!');
      return;
    }

    const existingItem = cart.find(item => item.book_id === book.book_id);
    
    if (existingItem) {
      if (existingItem.quantity >= book.stock_qty) {
        alert(`Only ${book.stock_qty} items available in stock!`);
        return;
      }
      setCart(cart.map(item =>
        item.book_id === book.book_id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...book, quantity: 1 }]);
    }
  };

  const updateQuantity = (bookId, newQuantity) => {
    const book = safeBooks.find(b => b.book_id === bookId);
    
    if (newQuantity <= 0) {
      removeFromCart(bookId);
      return;
    }

    if (newQuantity > book.stock_qty) {
      alert(`Only ${book.stock_qty} items available in stock!`);
      return;
    }

    setCart(cart.map(item =>
      item.book_id === bookId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const removeFromCart = (bookId) => {
    setCart(cart.filter(item => item.book_id !== bookId));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal().toFixed(2);
  };

  const clearCart = () => {
    if (cart.length > 0 && window.confirm('Are you sure you want to clear the cart?')) {
      setCart([]);
      setCustomerName('');
    }
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      alert('Please add items to cart before completing sale');
      return;
    }

    setLoading(true);
    try {
      const transactionData = {
        details: cart.map(item => ({
          book: item.book_id,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price),
        })),
        customer_name: customerName || 'Walk-in Customer',
      };

      const response = await transactionsAPI.create(transactionData);
      
      // Show success message
      alert(`Sale completed successfully!\nTransaction ID: ${response.trans_id}\nTotal: $${calculateTotal()}`);
      
      // Generate receipt
      printReceipt(response);
      
      // Clear cart and refresh inventory
      setCart([]);
      setCustomerName('');
      onRefresh();
      
    } catch (error) {
      console.error('Error completing sale:', error);
      
      // IMPROVED ERROR HANDLING
      let errorMsg = 'Failed to complete sale';
      
      if (error.response?.data) {
        const data = error.response.data;
        
        // Check for specific error types
        if (data.error) {
          // New format from improved serializer
          errorMsg = data.error;
        } else if (data.staff) {
          // Staff-specific error
          errorMsg = `Staff Profile Error: ${Array.isArray(data.staff) ? data.staff[0] : data.staff}`;
        } else if (data.detail) {
          // Generic detail error
          errorMsg = data.detail;
        } else if (data.message) {
          // Message field
          errorMsg = data.message;
        } else if (typeof data === 'string') {
          // Plain string error
          errorMsg = data;
        } else if (data.non_field_errors) {
          // Non-field errors
          errorMsg = Array.isArray(data.non_field_errors) 
            ? data.non_field_errors.join(', ') 
            : data.non_field_errors;
        } else {
          // Try to extract any error message from the response
          const firstError = Object.values(data)[0];
          if (firstError) {
            errorMsg = Array.isArray(firstError) ? firstError[0] : firstError;
          }
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      // Show user-friendly error message
      alert(`Error: ${errorMsg}\n\nIf you see "No staff profile found", please contact your administrator.`);
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = (transaction) => {
    // Simple receipt printing - opens in new window
    const receiptWindow = window.open('', '_blank', 'width=400,height=600');
    receiptWindow.document.write(`
      <html>
        <head>
          <title>Receipt #${transaction.trans_id}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              padding: 20px;
              max-width: 400px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .title {
              font-size: 18px;
              font-weight: bold;
            }
            .item {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-size: 12px;
            }
            .total {
              border-top: 2px dashed #000;
              margin-top: 10px;
              padding-top: 10px;
              font-weight: bold;
              font-size: 14px;
              display: flex;
              justify-content: space-between;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              border-top: 2px dashed #000;
              padding-top: 10px;
              font-size: 11px;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">FOLK RESEARCH CENTRE</div>
            <div>Library & Bookshop</div>
            <div>Castries, St. Lucia</div>
          </div>
          
          <div style="margin: 10px 0; font-size: 11px;">
            <div>Receipt #: ${transaction.trans_id}</div>
            <div>Date: ${new Date().toLocaleString()}</div>
            <div>Customer: ${customerName || 'Walk-in Customer'}</div>
          </div>
          
          <div style="border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px;">
            <strong>Items:</strong>
          </div>
          
          ${cart.map(item => `
            <div class="item">
              <div>
                <div>${item.title}</div>
                <div style="font-size: 10px; color: #666;">
                  ${item.quantity} × $${parseFloat(item.unit_price).toFixed(2)}
                </div>
              </div>
              <div>$${(item.quantity * item.unit_price).toFixed(2)}</div>
            </div>
          `).join('')}
          
          <div class="total">
            <span>TOTAL:</span>
            <span>$${calculateTotal()}</span>
          </div>
          
          <div class="footer">
            <div>Thank you for your purchase!</div>
            <div>www.folkculturestlucia.org</div>
            <div style="margin-top: 10px;">Preserving Caribbean Culture</div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    receiptWindow.document.close();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Book Selection Area - 2/3 width */}
      <div className="lg:col-span-2 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search books to add to cart..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
          {filteredBooks.length === 0 ? (
            <div className="col-span-2 bg-white p-8 rounded-lg shadow text-center">
              <ShoppingCart className="text-gray-400 mx-auto mb-4" size={48} />
              <p className="text-gray-600">
                {searchTerm ? 'No books found matching your search' : 'No books available'}
              </p>
            </div>
          ) : (
            filteredBooks.map(book => (
              <div
                key={book.book_id}
                className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
                onClick={() => addToCart(book)}
              >
                <h3 className="font-bold text-gray-900 mb-1">{book.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{book.author}</p>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-lg font-bold text-blue-600">
                      ${parseFloat(book.unit_price).toFixed(2)}
                    </span>
                    <span className={`text-sm ml-2 ${
                      book.stock_qty === 0 ? 'text-red-500' :
                      book.stock_qty < 5 ? 'text-orange-500' : 'text-gray-500'
                    }`}>
                      {book.stock_qty === 0 ? 'Out of stock' : `Stock: ${book.stock_qty}`}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(book);
                    }}
                    disabled={book.stock_qty === 0}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cart Area - 1/3 width */}
      <div className="bg-white p-6 rounded-lg shadow h-fit sticky top-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center">
            <ShoppingCart className="mr-2" size={24} />
            Cart ({cart.length})
          </h3>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Clear
            </button>
          )}
        </div>

        {/* Customer Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Name (Optional)
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Enter customer name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Cart Items */}
        <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="text-gray-300 mx-auto mb-2" size={48} />
              <p className="text-gray-500">Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.book_id} className="flex items-start justify-between p-3 bg-gray-50 rounded border border-gray-200">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="font-medium text-sm text-gray-900 truncate">{item.title}</p>
                  <p className="text-xs text-gray-600">${parseFloat(item.unit_price).toFixed(2)} each</p>
                  <p className="text-xs font-bold text-blue-600 mt-1">
                    ${(item.quantity * item.unit_price).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateQuantity(item.book_id, item.quantity - 1)}
                    className="w-7 h-7 bg-gray-200 rounded hover:bg-gray-300 flex items-center justify-center"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center font-bold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.book_id, item.quantity + 1)}
                    className="w-7 h-7 bg-gray-200 rounded hover:bg-gray-300 flex items-center justify-center"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.book_id)}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Total and Actions */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span className="text-blue-600">${calculateTotal()}</span>
          </div>

          <button
            onClick={completeSale}
            disabled={cart.length === 0 || loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed font-bold flex items-center justify-center space-x-2"
          >
            <CreditCard size={20} />
            <span>{loading ? 'Processing...' : 'Complete Sale'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Billing;