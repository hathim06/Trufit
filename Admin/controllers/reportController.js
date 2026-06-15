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
        const customStartDate = new Date(startDate);
        const customEndDate = new Date(endDate);
        customEndDate.setHours(23, 59, 59, 999);
        dateQuery = { $gte: customStartDate, $lte: customEndDate };
    }

    const query = dateQuery.$gte
        ? { createdAt: dateQuery, orderStatus: 'Delivered' }
        : { orderStatus: 'Delivered' };
    return await Order.find(query).populate('userId', 'firstName lastName email').sort({ createdAt: -1 });
};

const getOrderDiscount = order => order.discountAmount || order.couponDiscount || 0;

const getOrderTotal = order => {
    const computedOrderTotal = order.items
        ? order.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0)
        : 0;
    const subtotalOrderTotal = order.subtotal != null
        ? Math.max(0, order.subtotal - getOrderDiscount(order))
        : 0;

    return subtotalOrderTotal || order.totalAmount || computedOrderTotal;
};

const getCustomerName = order => {
    if (!order.userId) return 'N/A';
    return `${order.userId.firstName || ''} ${order.userId.lastName || ''}`.trim() || 'N/A';
};

const getReportRows = orders => orders.map(order => ({
    id: order._id.toString(),
    orderId: order.orderId || order._id.toString(),
    date: order.createdAt,
    dateText: order.createdAt.toISOString().split('T')[0],
    customer: getCustomerName(order),
    total: getOrderTotal(order),
    discount: getOrderDiscount(order),
    paymentMethod: order.paymentMethod || 'N/A'
}));

export const getSalesReport = async (req, res) => {
    try {
        const { filterType, startDate, endDate } = req.query;
        const orders = await getFilteredOrders(filterType, startDate, endDate);
        const reportRows = getReportRows(orders);

        const totalSalesCount = reportRows.length;
        const totalOrderAmount = reportRows.reduce((sum, order) => sum + order.total, 0);
        const totalDiscount = reportRows.reduce((sum, order) => sum + order.discount, 0);

        res.render('admin/sales-report', {
            orders: reportRows,
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
        const reportRows = getReportRows(orders);

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

        reportRows.forEach(order => {
            worksheet.addRow({
                _id: order.orderId,
                date: order.dateText,
                customer: order.customer,
                total: order.total,
                discount: order.discount,
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
        const reportRows = getReportRows(orders);

        const doc = new PDFDocument({ margin: 30 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');

        doc.pipe(res);

        doc.fontSize(20).text('Sales Report', { align: 'center' });
        doc.moveDown();

        reportRows.forEach(order => {
            doc.fontSize(12).text(`Order ID: ${order.orderId}`);
            doc.text(`Date: ${order.dateText}`);
            doc.text(`Customer: ${order.customer}`);
            doc.text(`Total Amount: Rs. ${order.total}`);
            doc.text(`Discount: Rs. ${order.discount}`);
            doc.moveDown();
        });

        doc.end();
    } catch (error) {
        console.error('PDF Download Error:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send('Error downloading PDF');
    }
};
