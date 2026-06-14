import Order from '../../User/models/orderModel.js';
import { STATUS_CODES } from '../../utils/statusCodes.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const getFilteredOrders = async (filterType, startDate, endDate) => {
    let dateQuery = {};
    const now = new Date();

    if (filterType === 'daily') {
        dateQuery = { $gte: new Date(now.setHours(0, 0, 0, 0)), $lte: new Date(now.setHours(23, 59, 59, 999)) };
    } else if (filterType === 'weekly') {
        const lastWeek = new Date(now.setDate(now.getDate() - 7));
        dateQuery = { $gte: lastWeek, $lte: new Date() };
    } else if (filterType === 'yearly') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        dateQuery = { $gte: startOfYear, $lte: new Date() };
    } else if (filterType === 'custom' && startDate && endDate) {
        dateQuery = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const query = dateQuery.$gte
        ? { createdAt: dateQuery, orderStatus: 'Delivered' }
        : { orderStatus: 'Delivered' };
    return await Order.find(query).populate('userId', 'firstName lastName email').sort({ createdAt: -1 });
};

export const getSalesReport = async (req, res) => {
    try {
        const { filterType, startDate, endDate } = req.query;
        const orders = await getFilteredOrders(filterType, startDate, endDate);

        let totalSalesCount = orders.length;
        let totalOrderAmount = 0;
        let totalDiscount = 0;

        orders.forEach(order => {
            totalOrderAmount += order.totalAmount;
            totalDiscount += (order.couponDiscount || 0);
        });

        res.render('admin/sales-report', {
            orders,
            totalSalesCount,
            totalOrderAmount,
            totalDiscount,
            filterType,
            startDate,
            endDate
        });
    } catch (error) {
        console.error('Sales Report Error:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send('Error generating report');
    }
};

export const downloadExcelReport = async (req, res) => {
    try {
        const { filterType, startDate, endDate } = req.query;
        const orders = await getFilteredOrders(filterType, startDate, endDate);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'Order ID', key: '_id', width: 25 },
            { header: 'Date', key: 'date', width: 20 },
            { header: 'Customer', key: 'customer', width: 25 },
            { header: 'Total Amount', key: 'total', width: 15 },
            { header: 'Discount', key: 'discount', width: 15 },
            { header: 'Payment Method', key: 'paymentMethod', width: 20 }
        ];

        orders.forEach(order => {
            worksheet.addRow({
                _id: order._id.toString(),
                date: order.createdAt.toISOString().split('T')[0],
                customer: order.userId ? `${order.userId.firstName} ${order.userId.lastName}` : 'N/A',
                total: order.totalAmount,
                discount: order.couponDiscount || 0,
                paymentMethod: order.paymentMethod
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Excel Download Error:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send('Error downloading Excel');
    }
};

export const downloadPdfReport = async (req, res) => {
    try {
        const { filterType, startDate, endDate } = req.query;
        const orders = await getFilteredOrders(filterType, startDate, endDate);

        const doc = new PDFDocument({ margin: 30 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');

        doc.pipe(res);

        doc.fontSize(20).text('Sales Report', { align: 'center' });
        doc.moveDown();

        orders.forEach(order => {
            doc.fontSize(12).text(`Order ID: ${order._id}`);
            doc.text(`Date: ${order.createdAt.toISOString().split('T')[0]}`);
            doc.text(`Customer: ${order.userId ? order.userId.firstName + ' ' + order.userId.lastName : 'N/A'}`);
            doc.text(`Total Amount: $${order.totalAmount}`);
            doc.text(`Discount: $${order.couponDiscount || 0}`);
            doc.moveDown();
        });

        doc.end();
    } catch (error) {
        console.error('PDF Download Error:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send('Error downloading PDF');
    }
};
