import * as shippingBillModel from '../models/shippingBill.js'; 

const getDashboard = async (req, res) => {
  try {
    const data = await shippingBillModel.getDashboardData();
    
    res.status(200).json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error fetching dashboard data'
    });
  }
};

export { getDashboard };