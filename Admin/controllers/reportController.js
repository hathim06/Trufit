import Order from '../../User/models/orderModel.js';
import { STATUS_CODES } from '../../utils/statusCodes.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const getFilteredOrders = async (filterType, startDate, endDate) => {
    let dateQuery = {};
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setHours(23, 59, 59, 999);

    if (filterType === 'daily') {
        dateQuery = { $gte: startOfToday, $lte: endOfToday };
    } else if (filterType === 'weekly') {
        const lastWeek = new Date(startOfToday);
        lastWeek.setDate(lastWeek.getDate() - 7);
        dateQuery = { $gte: lastWeek, $lte: endOfToday };
    } else if (filterType === 'monthly') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateQuery = { $gte: startOfMonth, $lte: endOfToday };
    } else if (filterType === 'yearly') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        dateQuery = { $gte: startOfYear, $lte: endOfToday };
    } else if (filterType === 'custom' && startDate && endDate) {
        const customStartDate = new Date(startDate);
        const customEndDate = new Date(endDate);
        if (!Number.isNaN(customStartDate.getTime()) && !Number.isNaN(customEndDate.getTime())) {
            customStartDate.setHours(0, 0, 0, 0);
            customEndDate.setHours(23, 59, 59, 999);
            dateQuery = { $gte: customStartDate, $lte: customEndDate };
        }
    }

    const query = Object.keys(dateQuery).length > 0
        ? { createdAt: dateQuery, orderStatus: 'Delivered' }
        : { orderStatus: 'Delivered' };
    return await Order.find(query).populate('userId', 'firstName lastName email').sort({ createdAt: -1 });
};

const getOrderDiscount = order => order.discountAmount || order.couponDiscount || 0;

const getOrderTotal = order => {
    const activeItems = (order.items || []).filter(item => !['Cancelled', 'Returned'].includes(item.status));
    const activeSubtotal = activeItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
    const safeOriginalSubtotal = Number(order.subtotal) || 0;
    const safeOriginalDiscount = getOrderDiscount(order);
    const displayDiscountAmount = safeOriginalSubtotal > 0 && safeOriginalDiscount > 0
        ? Math.max(0, Math.round((activeSubtotal / safeOriginalSubtotal) * safeOriginalDiscount))
        : 0;
    return Math.max(0, activeSubtotal - displayDiscountAmount);
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
        const normalizedFilter = filterType === 'custom' ? 'custom' : (filterType || '');
        const normalizedStartDate = typeof startDate === 'string' ? startDate : '';
        const normalizedEndDate = typeof endDate === 'string' ? endDate : '';

        if (normalizedFilter === 'custom' && (!normalizedStartDate || !normalizedEndDate)) {
            return res.render('admin/sales-report', {
                orders: [],
                totalSalesCount: 0,
                totalOrderAmount: 0,
                totalDiscount: 0,
                filterType: normalizedFilter,
                startDate: normalizedStartDate,
                endDate: normalizedEndDate,
                validationMessage: 'Please choose both start and end dates for a custom range.'
            });
        }

        if (normalizedFilter === 'custom' && normalizedStartDate && normalizedEndDate && normalizedStartDate > normalizedEndDate) {
            return res.render('admin/sales-report', {
                orders: [],
                totalSalesCount: 0,
                totalOrderAmount: 0,
                totalDiscount: 0,
                filterType: normalizedFilter,
                startDate: normalizedStartDate,
                endDate: normalizedEndDate,
                validationMessage: 'The start date cannot be after the end date.'
            });
        }
        
        const nowStr = new Date().toISOString().split('T')[0];
        if (normalizedFilter === 'custom' && normalizedEndDate && normalizedEndDate > nowStr) {
            return res.render('admin/sales-report', {
                orders: [],
                totalSalesCount: 0,
                totalOrderAmount: 0,
                totalDiscount: 0,
                filterType: normalizedFilter,
                startDate: normalizedStartDate,
                endDate: normalizedEndDate,
                validationMessage: 'The end date cannot be in the future.'
            });
        }

        const orders = await getFilteredOrders(normalizedFilter, normalizedStartDate, normalizedEndDate);
        const reportRows = getReportRows(orders);

        const totalSalesCount = reportRows.length;
        const totalOrderAmount = reportRows.reduce((sum, order) => sum + order.total, 0);
        const totalDiscount = reportRows.reduce((sum, order) => sum + order.discount, 0);

        res.render('admin/sales-report', {
            orders: reportRows,
            totalSalesCount,
            totalOrderAmount,
            totalDiscount,
            filterType: normalizedFilter,
            startDate: normalizedStartDate,
            endDate: normalizedEndDate,
            validationMessage: null
        });
    } catch (error) {
        console.error('Sales Report Error:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send('Error generating report');
    }
};

export const downloadExcelReport = async (req, res) => {
    try {
        const { filterType, startDate, endDate } = req.query;
        const normalizedFilter = filterType === 'custom' ? 'custom' : (filterType || '');
        const normalizedStartDate = typeof startDate === 'string' ? startDate : '';
        const normalizedEndDate = typeof endDate === 'string' ? endDate : '';
        const orders = await getFilteredOrders(normalizedFilter, normalizedStartDate, normalizedEndDate);
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
        const normalizedFilter = filterType === 'custom' ? 'custom' : (filterType || '');
        const normalizedStartDate = typeof startDate === 'string' ? startDate : '';
        const normalizedEndDate = typeof endDate === 'string' ? endDate : '';
        
        console.log('PDF Download - Filter:', normalizedFilter, 'Start:', normalizedStartDate, 'End:', normalizedEndDate);
        
        const orders = await getFilteredOrders(normalizedFilter, normalizedStartDate, normalizedEndDate);
        const reportRows = getReportRows(orders);

        console.log('PDF Download - Orders found:', reportRows.length);

        const doc = new PDFDocument({ margin: 30, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');

        doc.pipe(res);

        // Title
        doc.fontSize(18).font('Helvetica').text('Sales Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(1);

        // Table configuration
        const tableTop = doc.y;
        const tableStartX = 50;
        const colWidths = { orderId: 100, date: 70, customer: 130, total: 90, discount: 90 };
        const colPositions = { 
            orderId: tableStartX, 
            date: tableStartX + colWidths.orderId, 
            customer: tableStartX + colWidths.orderId + colWidths.date, 
            total: tableStartX + colWidths.orderId + colWidths.date + colWidths.customer, 
            discount: tableStartX + colWidths.orderId + colWidths.date + colWidths.customer + colWidths.total 
        };
        const rowHeight = 25;
        const tableWidth = Object.values(colWidths).reduce((sum, w) => sum + w, 0);

        // Draw table header
        doc.fontSize(11).font('Helvetica').fillColor('black');
        
      
        doc.rect(tableStartX, tableTop, tableWidth, rowHeight).fill('#f0f0f0');
        
        // Header text on top of background
        doc.fillColor('black');
        doc.text('Order ID', colPositions.orderId + 5, tableTop + 8, { width: colWidths.orderId - 10 });
        doc.text('Date', colPositions.date + 5, tableTop + 8, { width: colWidths.date - 10 });
        doc.text('Customer', colPositions.customer + 5, tableTop + 8, { width: colWidths.customer - 10 });
        doc.text('Total', colPositions.total + 5, tableTop + 8, { width: colWidths.total - 10 });
        doc.text('Discount', colPositions.discount + 5, tableTop + 8, { width: colWidths.discount - 10, align: 'right' });

        // Header border
        doc.rect(tableStartX, tableTop, tableWidth, rowHeight).stroke();

        let currentY = tableTop + rowHeight;

        // Table rows
        doc.fontSize(10).font('Helvetica').fillColor('black');
        
        if (reportRows.length === 0) {
            doc.text('No delivered orders found for the selected period.', tableStartX, currentY + 8);
        } else {
            reportRows.forEach((order, index) => {
                // Check if we need a new page
                if (currentY > 700) {
                    doc.addPage();
                    currentY = 50;
                    
                    // Redraw header on new page
                    doc.fontSize(11).font('Helvetica').fillColor('black');
                    // Header background first
                    doc.rect(tableStartX, currentY, tableWidth, rowHeight).fill('#f0f0f0');
                    // Header text on top
                    doc.fillColor('black');
                    doc.text('Order ID', colPositions.orderId + 5, currentY + 8, { width: colWidths.orderId - 10 });
                    doc.text('Date', colPositions.date + 5, currentY + 8, { width: colWidths.date - 10 });
                    doc.text('Customer', colPositions.customer + 5, currentY + 8, { width: colWidths.customer - 10 });
                    doc.text('Total', colPositions.total + 5, currentY + 8, { width: colWidths.total - 10 });
                    doc.text('Discount', colPositions.discount + 5, currentY + 8, { width: colWidths.discount - 10, align: 'right' });
                    doc.rect(tableStartX, currentY, tableWidth, rowHeight).stroke();
                    currentY += rowHeight;
                    doc.fontSize(10).font('Helvetica').fillColor('black');
                }

                // Row background (alternating) first
                if (index % 2 === 0) {
                    doc.rect(tableStartX, currentY, tableWidth, rowHeight).fill('#fafafa');
                }

                // Row text on top of background
                doc.fillColor('black');
                doc.text(order.orderId, colPositions.orderId + 5, currentY + 8, { width: colWidths.orderId - 10 });
                doc.text(order.dateText, colPositions.date + 5, currentY + 8, { width: colWidths.date - 10 });
                doc.text(order.customer, colPositions.customer + 5, currentY + 8, { width: colWidths.customer - 10 });
                doc.text(`Rs. ${Number(order.total || 0).toLocaleString()}`, colPositions.total + 5, currentY + 8, { width: colWidths.total - 10, align: 'right' });
                doc.text(`Rs. ${Number(order.discount || 0).toLocaleString()}`, colPositions.discount + 5, currentY + 8, { width: colWidths.discount - 10, align: 'right' });

                // Row border
                doc.rect(tableStartX, currentY, tableWidth, rowHeight).stroke();

                currentY += rowHeight;
            });
        }

        // Table outer border
        doc.rect(tableStartX, tableTop, tableWidth, currentY - tableTop).stroke();

        doc.end();
    } catch (error) {
        console.error('PDF Download Error:', error);
        console.error('Error stack:', error.stack);
        if (!res.headersSent) {
            res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send('Error downloading PDF');
        }
    }
};
