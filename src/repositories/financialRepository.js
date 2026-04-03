/**
 * Financial record repository - Handles data access operations for financial records
 */
export class FinancialRepository {
  constructor() {
    this.records = [];
    this.nextRecordId = 1;
  }

  /**
   * Create new financial record
   * @param {Object} recordData - Record data
   * @returns {Object} - Created record
   */
  create(recordData) {
    const newRecord = {
      id: this.nextRecordId++,
      ...recordData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.records.push(newRecord);
    return newRecord;
  }

  /**
   * Find record by ID
   * @param {number} id - Record ID
   * @returns {Object|null} - Record object or null
   */
  findById(id) {
    return this.records.find(record => record.id === id) || null;
  }

  /**
   * Get all records with filtering and sorting
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options (sort, pagination)
   * @returns {Object} - Records and pagination info
   */
  findAll(filters = {}, options = {}) {
    let filteredRecords = [...this.records];

    // Apply filters
    filteredRecords = this.applyFilters(filteredRecords, filters);

    // Apply sorting
    if (options.sortBy) {
      filteredRecords = this.applySorting(filteredRecords, options.sortBy, options.sortOrder);
    } else {
      // Default sort by date (newest first)
      filteredRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Apply pagination
    const pagination = this.applyPagination(filteredRecords, options.page, options.limit);
    const paginatedRecords = filteredRecords.slice(pagination.startIndex, pagination.endIndex);

    return {
      records: paginatedRecords,
      pagination: {
        currentPage: pagination.page,
        totalPages: pagination.totalPages,
        totalRecords: pagination.totalRecords,
        limit: pagination.limit,
        hasNextPage: pagination.hasNextPage,
        hasPrevPage: pagination.hasPrevPage
      }
    };
  }

  /**
   * Update record
   * @param {number} id - Record ID
   * @param {Object} updateData - Data to update
   * @returns {Object|null} - Updated record or null
   */
  update(id, updateData) {
    const recordIndex = this.records.findIndex(record => record.id === id);
    if (recordIndex === -1) return null;

    const updatedRecord = {
      ...this.records[recordIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    this.records[recordIndex] = updatedRecord;
    return updatedRecord;
  }

  /**
   * Delete record
   * @param {number} id - Record ID
   * @returns {Object|null} - Deleted record or null
   */
  delete(id) {
    const recordIndex = this.records.findIndex(record => record.id === id);
    if (recordIndex === -1) return null;

    const deletedRecord = this.records[recordIndex];
    this.records.splice(recordIndex, 1);
    return deletedRecord;
  }

  /**
   * Get records by user ID
   * @param {number} userId - User ID
   * @param {Object} filters - Additional filters
   * @returns {Array} - Array of records
   */
  findByUserId(userId, filters = {}) {
    return this.findAll({ ...filters, userId }, {}).records;
  }

  /**
   * Get summary statistics
   * @param {Object} filters - Filter criteria
   * @returns {Object} - Summary statistics
   */
  getSummary(filters = {}) {
    const { records } = this.findAll(filters, {});
    
    const incomeRecords = records.filter(r => r.type === 'income');
    const expenseRecords = records.filter(r => r.type === 'expense');

    const totalIncome = incomeRecords.reduce((sum, r) => sum + r.amount, 0);
    const totalExpenses = expenseRecords.reduce((sum, r) => sum + r.amount, 0);

    return {
      totalIncome,
      totalExpenses,
      netAmount: totalIncome - totalExpenses,
      totalRecords: records.length,
      incomeTransactions: incomeRecords.length,
      expenseTransactions: expenseRecords.length,
      avgIncome: incomeRecords.length > 0 ? totalIncome / incomeRecords.length : 0,
      avgExpense: expenseRecords.length > 0 ? totalExpenses / expenseRecords.length : 0
    };
  }

  /**
   * Get category breakdown
   * @param {Object} filters - Filter criteria
   * @returns {Array} - Category breakdown
   */
  getCategoryBreakdown(filters = {}) {
    const { records } = this.findAll(filters, {});
    
    const categoryMap = records.reduce((acc, record) => {
      if (!acc[record.category]) {
        acc[record.category] = {
          category: record.category,
          totalIncome: 0,
          totalExpenses: 0,
          transactionCount: 0,
          incomeCount: 0,
          expenseCount: 0
        };
      }

      if (record.type === 'income') {
        acc[record.category].totalIncome += record.amount;
        acc[record.category].incomeCount++;
      } else {
        acc[record.category].totalExpenses += record.amount;
        acc[record.category].expenseCount++;
      }

      acc[record.category].transactionCount++;
      acc[record.category].netAmount = 
        acc[record.category].totalIncome - acc[record.category].totalExpenses;

      return acc;
    }, {});

    return Object.values(categoryMap).sort((a, b) => 
      (b.totalIncome + b.totalExpenses) - (a.totalIncome + a.totalExpenses)
    );
  }

  /**
   * Get monthly summary
   * @param {number} months - Number of months to include
   * @param {Object} filters - Additional filters
   * @returns {Array} - Monthly summary
   */
  getMonthlySummary(months = 12, filters = {}) {
    const { records } = this.findAll(filters, {});
    
    const monthlyMap = records.reduce((acc, record) => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          monthName: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          totalIncome: 0,
          totalExpenses: 0,
          netAmount: 0,
          transactionCount: 0,
          incomeCount: 0,
          expenseCount: 0
        };
      }

      if (record.type === 'income') {
        acc[monthKey].totalIncome += record.amount;
        acc[monthKey].incomeCount++;
      } else {
        acc[monthKey].totalExpenses += record.amount;
        acc[monthKey].expenseCount++;
      }

      acc[monthKey].netAmount = acc[monthKey].totalIncome - acc[monthKey].totalExpenses;
      acc[monthKey].transactionCount++;

      return acc;
    }, {});

    return Object.values(monthlyMap)
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, months);
  }

  /**
   * Get available categories
   * @returns {Array} - Array of unique categories
   */
  getCategories() {
    return [...new Set(this.records.map(r => r.category))];
  }

  /**
   * Apply filters to records
   * @param {Array} records - Records to filter
   * @param {Object} filters - Filter criteria
   * @returns {Array} - Filtered records
   */
  applyFilters(records, filters) {
    return records.filter(record => {
      if (filters.userId && record.userId !== filters.userId) return false;
      if (filters.type && record.type !== filters.type) return false;
      if (filters.category && !record.category.toLowerCase().includes(filters.category.toLowerCase())) return false;
      if (filters.dateFrom && new Date(record.date) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(record.date) > new Date(filters.dateTo)) return false;
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        if (!record.category.toLowerCase().includes(searchTerm) && 
            !record.notes.toLowerCase().includes(searchTerm)) return false;
      }
      return true;
    });
  }

  /**
   * Apply sorting to records
   * @param {Array} records - Records to sort
   * @param {string} sortBy - Field to sort by
   * @param {string} sortOrder - Sort order (asc/desc)
   * @returns {Array} - Sorted records
   */
  applySorting(records, sortBy, sortOrder = 'desc') {
    return records.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'date' || sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
  }

  /**
   * Apply pagination to records
   * @param {Array} records - Records to paginate
   * @param {number} page - Page number
   * @param {number} limit - Records per page
   * @returns {Object} - Pagination info
   */
  applyPagination(records, page = 1, limit = 10) {
    const totalRecords = records.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      page,
      limit,
      totalRecords,
      totalPages,
      startIndex,
      endIndex,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  }

  /**
   * Clear all records (for testing)
   */
  clear() {
    this.records = [];
    this.nextRecordId = 1;
  }

  /**
   * Create sample records
   */
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

// Export singleton instance
export const financialRepository = new FinancialRepository();
