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
      
      // Calculate Monthly Revenue for current month
      if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
        monthlyRevenue += numericPrice;
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

    // 4. Format Charts Array
    const revenuePerformance = Object.keys(monthlyRevenueMap).map(month => ({
      month,
      revenue: monthlyRevenueMap[month]
    }));

    const orderVolume = Object.keys(orderVolumeMap).map(day => ({
      day,
      orders: orderVolumeMap[day]
    }));

    // 5. Construct highly-tailored API Response
    return {
      summary: {
        monthlyRevenue: {
          value: monthlyRevenue,
          growth: "+12.5%" // Mocked growth percentage for now
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
