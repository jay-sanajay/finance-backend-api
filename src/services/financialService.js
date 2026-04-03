const FinancialRecord = require('../models/FinancialRecord');

// In-memory storage for financial records
let records = [];
let nextRecordId = 1;

class FinancialService {
  // Create a new financial record
  create(recordData) {
    const validationErrors = FinancialRecord.validate(recordData);
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    try {
      const sanitizedData = FinancialRecord.sanitize(recordData);
      const newRecord = new FinancialRecord({
        ...sanitizedData,
        id: nextRecordId++
      });

      records.push(newRecord);
      return { success: true, data: newRecord.toJSON() };
    } catch (error) {
      return { success: false, errors: ['Failed to create record'] };
    }
  }

  // Get all records with filtering and pagination
  getAll(filters = {}, pagination = {}) {
    try {
      let filteredRecords = [...records];

      // Apply filters
      if (filters.userId) {
        filteredRecords = filteredRecords.filter(record => record.userId === filters.userId);
      }

      if (filters.type) {
        filteredRecords = filteredRecords.filter(record => record.type === filters.type);
      }

      if (filters.category) {
        filteredRecords = filteredRecords.filter(record => 
          record.category.toLowerCase().includes(filters.category.toLowerCase())
        );
      }

      if (filters.dateFrom) {
        const dateFrom = new Date(filters.dateFrom);
        filteredRecords = filteredRecords.filter(record => 
          new Date(record.date) >= dateFrom
        );
      }

      if (filters.dateTo) {
        const dateTo = new Date(filters.dateTo);
        filteredRecords = filteredRecords.filter(record => 
          new Date(record.date) <= dateTo
        );
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredRecords = filteredRecords.filter(record => 
          record.category.toLowerCase().includes(searchTerm) ||
          record.notes.toLowerCase().includes(searchTerm)
        );
      }

      // Sort by date (newest first) by default
      filteredRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Apply pagination
      const page = parseInt(pagination.page) || 1;
      const limit = parseInt(pagination.limit) || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      const paginatedRecords = filteredRecords.slice(startIndex, endIndex);
      
      // Calculate pagination metadata
      const totalRecords = filteredRecords.length;
      const totalPages = Math.ceil(totalRecords / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        success: true,
        data: {
          records: paginatedRecords.map(record => record.toJSON()),
          pagination: {
            currentPage: page,
            totalPages,
            totalRecords,
            limit,
            hasNextPage,
            hasPrevPage
          }
        }
      };
    } catch (error) {
      return { success: false, errors: ['Failed to retrieve records'] };
    }
  }

  // Get record by ID
  getById(id) {
    try {
      const record = records.find(r => r.id === parseInt(id));
      
      if (!record) {
        return { success: false, errors: ['Record not found'] };
      }

      return { success: true, data: record.toJSON() };
    } catch (error) {
      return { success: false, errors: ['Failed to retrieve record'] };
    }
  }

  // Update a financial record
  update(id, updateData) {
    const validationErrors = FinancialRecord.validate(updateData, true);
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    try {
      const recordIndex = records.findIndex(r => r.id === parseInt(id));
      
      if (recordIndex === -1) {
        return { success: false, errors: ['Record not found'] };
      }

      const sanitizedData = FinancialRecord.sanitize(updateData);
      const existingRecord = records[recordIndex];
      
      // Update record fields
      const updatedRecord = new FinancialRecord({
        ...existingRecord,
        ...sanitizedData,
        id: existingRecord.id, // Preserve original ID
        createdAt: existingRecord.createdAt, // Preserve creation time
        updatedAt: new Date().toISOString()
      });

      records[recordIndex] = updatedRecord;
      return { success: true, data: updatedRecord.toJSON() };
    } catch (error) {
      return { success: false, errors: ['Failed to update record'] };
    }
  }

  // Delete a financial record
  delete(id) {
    try {
      const recordIndex = records.findIndex(r => r.id === parseInt(id));
      
      if (recordIndex === -1) {
        return { success: false, errors: ['Record not found'] };
      }

      const deletedRecord = records[recordIndex];
      records.splice(recordIndex, 1);
      
      return { 
        success: true, 
        data: { 
          message: 'Record deleted successfully',
          deletedRecord: deletedRecord.toJSON()
        }
      };
    } catch (error) {
      return { success: false, errors: ['Failed to delete record'] };
    }
  }

  // Get financial summary statistics
  getSummary(filters = {}) {
    try {
      const result = this.getAll(filters, { page: 1, limit: 10000 }); // Get all records for summary
      
      if (!result.success) {
        return result;
      }

      const records = result.data.records;
      const totalIncome = records
        .filter(r => r.type === 'income')
        .reduce((sum, r) => sum + r.amount, 0);
      
      const totalExpenses = records
        .filter(r => r.type === 'expense')
        .reduce((sum, r) => sum + r.amount, 0);
      
      const netAmount = totalIncome - totalExpenses;

      // Group by category
      const categoryBreakdown = records.reduce((acc, record) => {
        if (!acc[record.category]) {
          acc[record.category] = { income: 0, expense: 0, count: 0 };
        }
        acc[record.category][record.type] += record.amount;
        acc[record.category].count += 1;
        return acc;
      }, {});

      return {
        success: true,
        data: {
          totalIncome,
          totalExpenses,
          netAmount,
          totalRecords: records.length,
          categoryBreakdown
        }
      };
    } catch (error) {
      return { success: false, errors: ['Failed to generate summary'] };
    }
  }

  // Get available categories
  getCategories() {
    try {
      const categories = [...new Set(records.map(r => r.category))];
      return { success: true, data: { categories } };
    } catch (error) {
      return { success: false, errors: ['Failed to retrieve categories'] };
    }
  }

  // Clear all records (for testing purposes)
  clearRecords() {
    records = [];
    nextRecordId = 1;
  }

  // Get all records (for testing purposes)
  getAllRecords() {
    return records.map(record => record.toJSON());
  }

  // Create sample records for testing
  createSampleRecords() {
    const sampleRecords = [
      {
        amount: 5000,
        type: 'income',
        category: 'Salary',
        date: '2024-01-15',
        notes: 'Monthly salary',
        userId: 1
      },
      {
        amount: 1200,
        type: 'expense',
        category: 'Rent',
        date: '2024-01-01',
        notes: 'Monthly rent payment',
        userId: 1
      },
      {
        amount: 300,
        type: 'expense',
        category: 'Food',
        date: '2024-01-10',
        notes: 'Grocery shopping',
        userId: 1
      },
      {
        amount: 1500,
        type: 'income',
        category: 'Freelance',
        date: '2024-01-20',
        notes: 'Freelance project payment',
        userId: 2
      },
      {
        amount: 200,
        type: 'expense',
        category: 'Transportation',
        date: '2024-01-12',
        notes: 'Gas and parking',
        userId: 2
      }
    ];

    sampleRecords.forEach(recordData => {
      this.create(recordData);
    });
  }
}

module.exports = new FinancialService();
