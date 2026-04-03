class FinancialRecord {
  constructor(data) {
    this.id = data.id;
    this.amount = data.amount;
    this.type = data.type; // 'income' or 'expense'
    this.category = data.category;
    this.date = data.date; // ISO date string
    this.notes = data.notes || '';
    this.userId = data.userId;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // Validate record data
  static validate(data, isUpdate = false) {
    const errors = [];
    
    // Amount validation
    if (!isUpdate || data.amount !== undefined) {
      if (data.amount === undefined || data.amount === null) {
        errors.push('Amount is required');
      } else if (typeof data.amount !== 'number' || isNaN(data.amount)) {
        errors.push('Amount must be a valid number');
      } else if (data.amount <= 0) {
        errors.push('Amount must be greater than 0');
      }
    }

    // Type validation
    if (!isUpdate || data.type !== undefined) {
      if (!data.type) {
        errors.push('Type is required');
      } else if (!['income', 'expense'].includes(data.type)) {
        errors.push('Type must be either "income" or "expense"');
      }
    }

    // Category validation
    if (!isUpdate || data.category !== undefined) {
      if (!data.category) {
        errors.push('Category is required');
      } else if (typeof data.category !== 'string' || data.category.trim().length === 0) {
        errors.push('Category must be a non-empty string');
      } else if (data.category.length > 50) {
        errors.push('Category must not exceed 50 characters');
      }
    }

    // Date validation
    if (!isUpdate || data.date !== undefined) {
      if (!data.date) {
        errors.push('Date is required');
      } else {
        const date = new Date(data.date);
        if (isNaN(date.getTime())) {
          errors.push('Date must be a valid date');
        } else if (date > new Date()) {
          errors.push('Date cannot be in the future');
        }
      }
    }

    // Notes validation (optional)
    if (data.notes !== undefined && data.notes !== null) {
      if (typeof data.notes !== 'string') {
        errors.push('Notes must be a string');
      } else if (data.notes.length > 500) {
        errors.push('Notes must not exceed 500 characters');
      }
    }

    // User ID validation
    if (!isUpdate || data.userId !== undefined) {
      if (!data.userId) {
        errors.push('User ID is required');
      } else if (typeof data.userId !== 'number' || data.userId <= 0) {
        errors.push('User ID must be a positive number');
      }
    }

    return errors;
  }

  // Sanitize record data
  static sanitize(data) {
    const sanitized = {};
    
    if (data.amount !== undefined) {
      sanitized.amount = parseFloat(data.amount);
    }
    
    if (data.type !== undefined) {
      sanitized.type = data.type.toLowerCase().trim();
    }
    
    if (data.category !== undefined) {
      sanitized.category = data.category.trim();
    }
    
    if (data.date !== undefined) {
      const date = new Date(data.date);
      sanitized.date = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    }
    
    if (data.notes !== undefined) {
      sanitized.notes = data.notes.trim();
    }
    
    if (data.userId !== undefined) {
      sanitized.userId = parseInt(data.userId);
    }
    
    return sanitized;
  }

  // Create a clean record object for API responses
  toJSON() {
    return {
      id: this.id,
      amount: this.amount,
      type: this.type,
      category: this.category,
      date: this.date,
      notes: this.notes,
      userId: this.userId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = FinancialRecord;
