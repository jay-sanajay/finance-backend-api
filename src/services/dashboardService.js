const financialService = require('./financialService');

class DashboardService {
  // Get overall financial summary
  getOverallSummary(filters = {}) {
    try {
      const result = financialService.getAll(filters, { page: 1, limit: 10000 });
      
      if (!result.success) {
        return result;
      }

      const records = result.data.records;
      
      // Calculate totals
      const totalIncome = records
        .filter(r => r.type === 'income')
        .reduce((sum, r) => sum + r.amount, 0);
      
      const totalExpenses = records
        .filter(r => r.type === 'expense')
        .reduce((sum, r) => sum + r.amount, 0);
      
      const netBalance = totalIncome - totalExpenses;
      
      // Calculate additional metrics
      const totalTransactions = records.length;
      const incomeTransactions = records.filter(r => r.type === 'income').length;
      const expenseTransactions = records.filter(r => r.type === 'expense').length;
      
      // Calculate average amounts
      const avgIncome = incomeTransactions > 0 ? totalIncome / incomeTransactions : 0;
      const avgExpense = expenseTransactions > 0 ? totalExpenses / expenseTransactions : 0;

      return {
        success: true,
        data: {
          totalIncome,
          totalExpenses,
          netBalance,
          totalTransactions,
          incomeTransactions,
          expenseTransactions,
          avgIncome,
          avgExpense,
          profitMargin: totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(2) : 0
        }
      };
    } catch (error) {
      return { success: false, errors: ['Failed to calculate overall summary'] };
    }
  }

  // Get category-wise aggregation
  getCategoryAggregation(filters = {}) {
    try {
      const result = financialService.getAll(filters, { page: 1, limit: 10000 });
      
      if (!result.success) {
        return result;
      }

      const records = result.data.records;
      
      // Group by category and type
      const categoryData = records.reduce((acc, record) => {
        const category = record.category;
        
        if (!acc[category]) {
          acc[category] = {
            category,
            totalIncome: 0,
            totalExpenses: 0,
            netAmount: 0,
            transactionCount: 0,
            incomeCount: 0,
            expenseCount: 0
          };
        }
        
        if (record.type === 'income') {
          acc[category].totalIncome += record.amount;
          acc[category].incomeCount++;
        } else {
          acc[category].totalExpenses += record.amount;
          acc[category].expenseCount++;
        }
        
        acc[category].netAmount = acc[category].totalIncome - acc[category].totalExpenses;
        acc[category].transactionCount++;
        
        return acc;
      }, {});

      // Convert to array and sort by total amount (income + expenses)
      const categories = Object.values(categoryData)
        .map(cat => ({
          ...cat,
          totalAmount: cat.totalIncome + cat.totalExpenses,
          avgIncome: cat.incomeCount > 0 ? cat.totalIncome / cat.incomeCount : 0,
          avgExpense: cat.expenseCount > 0 ? cat.totalExpenses / cat.expenseCount : 0
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);

      // Calculate totals for all categories
      const totals = categories.reduce((acc, cat) => {
        acc.totalIncome += cat.totalIncome;
        acc.totalExpenses += cat.totalExpenses;
        acc.totalTransactions += cat.transactionCount;
        return acc;
      }, { totalIncome: 0, totalExpenses: 0, totalTransactions: 0 });

      return {
        success: true,
        data: {
          categories,
          totals,
          categoryCount: categories.length
        }
      };
    } catch (error) {
      return { success: false, errors: ['Failed to generate category aggregation'] };
    }
  }

  // Get recent transactions
  getRecentTransactions(limit = 10, filters = {}) {
    try {
      const result = financialService.getAll(filters, { page: 1, limit: limit * 2 });
      
      if (!result.success) {
        return result;
      }

      // Sort by date (newest first) and by creation time as secondary sort
      const recentTransactions = result.data.records
        .sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          if (dateB.getTime() !== dateA.getTime()) {
            return dateB.getTime() - dateA.getTime();
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
        .slice(0, limit);

      // Add relative time information
      const transactionsWithTimeInfo = recentTransactions.map(transaction => {
        const transactionDate = new Date(transaction.date);
        const today = new Date();
        const diffTime = today.getTime() - transactionDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let timeAgo;
        if (diffDays === 0) {
          timeAgo = 'Today';
        } else if (diffDays === 1) {
          timeAgo = 'Yesterday';
        } else if (diffDays < 7) {
          timeAgo = `${diffDays} days ago`;
        } else if (diffDays < 30) {
          const weeks = Math.floor(diffDays / 7);
          timeAgo = `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else if (diffDays < 365) {
          const months = Math.floor(diffDays / 30);
          timeAgo = `${months} month${months > 1 ? 's' : ''} ago`;
        } else {
          const years = Math.floor(diffDays / 365);
          timeAgo = `${years} year${years > 1 ? 's' : ''} ago`;
        }

        return {
          ...transaction,
          timeAgo,
          daysAgo: diffDays
        };
      });

      return {
        success: true,
        data: {
          transactions: transactionsWithTimeInfo,
          count: transactionsWithTimeInfo.length
        }
      };
    } catch (error) {
      return { success: false, errors: ['Failed to retrieve recent transactions'] };
    }
  }

  // Get monthly summary
  getMonthlySummary(months = 12, filters = {}) {
    try {
      const result = financialService.getAll(filters, { page: 1, limit: 10000 });
      
      if (!result.success) {
        return result;
      }

      const records = result.data.records;
      
      // Group records by month
      const monthlyData = records.reduce((acc, record) => {
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

      // Convert to array, sort by month (newest first), and limit to requested months
      const monthlySummary = Object.values(monthlyData)
        .sort((a, b) => b.month.localeCompare(a.month))
        .slice(0, months)
        .map(month => ({
          ...month,
          avgIncome: month.incomeCount > 0 ? month.totalIncome / month.incomeCount : 0,
          avgExpense: month.expenseCount > 0 ? month.totalExpenses / month.expenseCount : 0,
          savingsRate: month.totalIncome > 0 ? ((month.netAmount / month.totalIncome) * 100).toFixed(2) : 0
        }));

      // Calculate trends (compare with previous month)
      const monthlyWithTrends = monthlySummary.map((month, index) => {
        if (index === 0) {
          return { ...month, incomeTrend: 0, expenseTrend: 0, netTrend: 0 };
        }
        
        const prevMonth = monthlySummary[index + 1]; // Next in array due to reverse sort
        const incomeTrend = prevMonth ? ((month.totalIncome - prevMonth.totalIncome) / prevMonth.totalIncome * 100) : 0;
        const expenseTrend = prevMonth ? ((month.totalExpenses - prevMonth.totalExpenses) / prevMonth.totalExpenses * 100) : 0;
        const netTrend = prevMonth ? ((month.netAmount - prevMonth.netAmount) / Math.abs(prevMonth.netAmount || 1) * 100) : 0;
        
        return {
          ...month,
          incomeTrend: parseFloat(incomeTrend.toFixed(2)),
          expenseTrend: parseFloat(expenseTrend.toFixed(2)),
          netTrend: parseFloat(netTrend.toFixed(2))
        };
      });

      // Calculate overall statistics
      const totals = monthlyWithTrends.reduce((acc, month) => {
        acc.totalIncome += month.totalIncome;
        acc.totalExpenses += month.totalExpenses;
        acc.totalTransactions += month.transactionCount;
        acc.monthsWithData++;
        return acc;
      }, { totalIncome: 0, totalExpenses: 0, totalTransactions: 0, monthsWithData: 0 });

      return {
        success: true,
        data: {
          monthlySummary: monthlyWithTrends,
          totals: {
            ...totals,
            avgMonthlyIncome: totals.monthsWithData > 0 ? totals.totalIncome / totals.monthsWithData : 0,
            avgMonthlyExpenses: totals.monthsWithData > 0 ? totals.totalExpenses / totals.monthsWithData : 0,
            avgMonthlyNet: totals.monthsWithData > 0 ? (totals.totalIncome - totals.totalExpenses) / totals.monthsWithData : 0
          },
          period: {
            months: monthlyWithTrends.length,
            startMonth: monthlyWithTrends[monthlyWithTrends.length - 1]?.month,
            endMonth: monthlyWithTrends[0]?.month
          }
        }
      };
    } catch (error) {
      return { success: false, errors: ['Failed to generate monthly summary'] };
    }
  }

  // Get comprehensive dashboard data
  getDashboardData(filters = {}) {
    try {
      const overallSummary = this.getOverallSummary(filters);
      const categoryAggregation = this.getCategoryAggregation(filters);
      const recentTransactions = this.getRecentTransactions(5, filters);
      const monthlySummary = this.getMonthlySummary(6, filters); // Last 6 months

      // Check if any operation failed
      const errors = [];
      if (!overallSummary.success) errors.push(...overallSummary.errors);
      if (!categoryAggregation.success) errors.push(...categoryAggregation.errors);
      if (!recentTransactions.success) errors.push(...recentTransactions.errors);
      if (!monthlySummary.success) errors.push(...monthlySummary.errors);

      if (errors.length > 0) {
        return { success: false, errors };
      }

      // Generate insights
      const insights = this.generateInsights(
        overallSummary.data,
        categoryAggregation.data,
        monthlySummary.data
      );

      return {
        success: true,
        data: {
          overview: overallSummary.data,
          categories: categoryAggregation.data,
          recentTransactions: recentTransactions.data,
          monthlyTrends: monthlySummary.data,
          insights,
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      return { success: false, errors: ['Failed to generate dashboard data'] };
    }
  }

  // Generate financial insights
  generateInsights(overview, categories, monthlyTrends) {
    const insights = [];

    // Profitability insight
    if (overview.netBalance > 0) {
      insights.push({
        type: 'positive',
        title: 'Positive Cash Flow',
        description: `You have a positive net balance of $${overview.netBalance.toFixed(2)}`,
        icon: 'trending-up'
      });
    } else if (overview.netBalance < 0) {
      insights.push({
        type: 'warning',
        title: 'Negative Cash Flow',
        description: `Your expenses exceed income by $${Math.abs(overview.netBalance).toFixed(2)}`,
        icon: 'trending-down'
      });
    }

    // Top category insight
    if (categories.categories.length > 0) {
      const topCategory = categories.categories[0];
      insights.push({
        type: 'info',
        title: 'Top Category',
        description: `${topCategory.category} is your highest category with $${topCategory.totalAmount.toFixed(2)} in transactions`,
        icon: 'category'
      });
    }

    // Monthly trend insight
    if (monthlyTrends.monthlySummary.length >= 2) {
      const latestMonth = monthlyTrends.monthlySummary[0];
      const prevMonth = monthlyTrends.monthlySummary[1];
      
      if (latestMonth.netTrend > 10) {
        insights.push({
          type: 'positive',
          title: 'Improving Finances',
          description: `Your net balance improved by ${latestMonth.netTrend}% compared to last month`,
          icon: 'growth'
        });
      } else if (latestMonth.netTrend < -10) {
        insights.push({
          type: 'warning',
          title: 'Declining Finances',
          description: `Your net balance decreased by ${Math.abs(latestMonth.netTrend)}% compared to last month`,
          icon: 'decline'
        });
      }
    }

    // Expense ratio insight
    const expenseRatio = overview.totalIncome > 0 ? (overview.totalExpenses / overview.totalIncome) * 100 : 0;
    if (expenseRatio > 80) {
      insights.push({
        type: 'warning',
        title: 'High Expense Ratio',
        description: `Your expenses are ${expenseRatio.toFixed(1)}% of your income. Consider reducing costs.`,
        icon: 'alert'
      });
    } else if (expenseRatio < 50) {
      insights.push({
        type: 'positive',
        title: 'Healthy Expense Ratio',
        description: `Your expenses are only ${expenseRatio.toFixed(1)}% of your income. Great job!`,
        icon: 'savings'
      });
    }

    return insights;
  }
}

module.exports = new DashboardService();
