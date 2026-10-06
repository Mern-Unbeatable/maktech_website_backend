import { prisma } from '../../config/db.js';

export class DashboardService {
  async getDashboardSummary() {
    // 1. Run independent queries concurrently
    const [allOrders, allLeads] = await Promise.all([
      prisma.order.findMany({
        select: {
          id: true,
          price: true,
          client: true,
          status: true,
          createdAt: true
        }
      }),
      prisma.lead.findMany({
        select: {
          id: true,
          createdAt: true
        }
      })
    ]);

    // 2. Process Orders Data
    let lifetimeRevenue = 0;
    let monthlyRevenue = 0;
    let lastMonthRevenue = 0;
    const activeClientsSet = new Set();
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Chart Data Initialization
    const monthlyRevenueMap = {
      'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0, 'May': 0, 'Jun': 0,
      'Jul': 0, 'Aug': 0, 'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
    };
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const orderVolumeMap = {
      'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
    };

    allOrders.forEach(order => {
      // Parse price
      let numericPrice = 0;
      if (order.price) {
        numericPrice = parseFloat(order.price.replace(/[^0-9.-]+/g, ""));
        if (isNaN(numericPrice)) numericPrice = 0;
      }

      lifetimeRevenue += numericPrice;
      
      // Active Clients: Must have an IN_PROGRESS order, and tracked uniquely by client name
      if (order.client && order.status === 'IN_PROGRESS') {
        activeClientsSet.add(order.client);
      }

      const orderDate = new Date(order.createdAt);
      
      // Calculate Monthly Revenue for current month and last month
      if (orderDate.getFullYear() === currentYear) {
        if (orderDate.getMonth() === currentMonth) {
          monthlyRevenue += numericPrice;
        } else if (orderDate.getMonth() === currentMonth - 1 || (currentMonth === 0 && orderDate.getMonth() === 11 && orderDate.getFullYear() === currentYear - 1)) {
          // Handles January (currentMonth = 0) rolling back to December of previous year
          lastMonthRevenue += numericPrice;
        }
      } else if (currentMonth === 0 && orderDate.getFullYear() === currentYear - 1 && orderDate.getMonth() === 11) {
        lastMonthRevenue += numericPrice;
      }

      // Populate Revenue Performance Chart (by month)
      if (orderDate.getFullYear() === currentYear) {
        const monthString = orderDate.toLocaleString('default', { month: 'short' }); // "Jan", "Feb"
        if (monthlyRevenueMap[monthString] !== undefined) {
          monthlyRevenueMap[monthString] += numericPrice;
        }
      }

      // Populate Order Volume Chart (This week)
      // For simplicity, we'll just check if it's within the last 7 days
      const diffTime = Math.abs(now - orderDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      if (diffDays <= 7) {
        const dayString = dayNames[orderDate.getDay()];
        if (orderVolumeMap[dayString] !== undefined) {
          orderVolumeMap[dayString] += 1;
        }
      }
    });

    // 3. Process Leads Data
    const totalLeads = allLeads.length;
    let leadsThisWeek = 0;
    
    allLeads.forEach(lead => {
      const leadDate = new Date(lead.createdAt);
      const diffTime = Math.abs(now - leadDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      if (diffDays <= 7) {
        leadsThisWeek += 1;
      }
    });

    // 4. Calculate Growth
    let revenueGrowth = 0;
    if (lastMonthRevenue > 0) {
      revenueGrowth = ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    } else if (monthlyRevenue > 0) {
      revenueGrowth = 100; // If last month was 0 but this month has revenue
    }
    const growthString = revenueGrowth >= 0 ? `+${revenueGrowth.toFixed(1)}%` : `${revenueGrowth.toFixed(1)}%`;

    // 5. Format Charts Array
    const revenuePerformance = Object.keys(monthlyRevenueMap).map(month => ({
      month,
      revenue: monthlyRevenueMap[month]
    }));

    const orderVolume = Object.keys(orderVolumeMap).map(day => ({
      day,
      orders: orderVolumeMap[day]
    }));

    // 6. Construct highly-tailored API Response
    return {
      summary: {
        monthlyRevenue: {
          value: monthlyRevenue,
          growth: growthString
        },
        lifetimeRevenue: {
          value: lifetimeRevenue
        },
        activeClients: {
          value: activeClientsSet.size
        },
        totalLeads: {
          value: totalLeads,
          growth: `+${leadsThisWeek} this week`
        }
      },
      charts: {
        revenuePerformance,
        orderVolume
      }
    };
  }
}
