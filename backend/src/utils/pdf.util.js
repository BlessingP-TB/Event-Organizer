const PDFDocument = require('pdfkit');
const logger = require('./logger.util');

const generatePdfBuffer = (doc, onEnd) => {
    return new Promise((resolve, reject) => {
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            try {
                if (onEnd) {
                    onEnd();
                }
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            } catch (e) {
                logger.error('Error concatenating PDF buffers', e);
                reject(e);
            }
        });
        doc.on('error', (err) => {
            logger.error('PDF generation error', err);
            reject(err);
        });
        doc.end();
    });
};

const addHeader = (doc, issuer, logoBuffer) => {
    const headerY = 45;
    const headerX = doc.page.margins.left;
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.save();

    if (logoBuffer) {
        try {
            doc.image(logoBuffer, headerX, headerY, { width: 100 });
        } catch (e) {
            logger.warn('Failed to parse PDF logo image buffer', e);
            doc.fontSize(20)
                .font('Helvetica-Bold')
                .text(issuer.institutionName, headerX, headerY + 15);
        }
    } else {
        doc.fontSize(20)
            .font('Helvetica-Bold')
            .text(issuer.institutionName, headerX, headerY + 15);
    }

    const rightBlockX = headerX + (contentWidth / 2);
    const rightBlockWidth = contentWidth / 2;

    doc.fontSize(10)
        .font('Helvetica')
        .text(
            issuer.institutionAddress.join('\n'),
            rightBlockX,
            headerY + 5,
            { align: 'right', width: rightBlockWidth }
        );
    doc.fontSize(10)
        .font('Helvetica')
        .text(
            issuer.otherDetails.join('\n'),
            rightBlockX,
            headerY + 35,
            { align: 'right', width: rightBlockWidth }
        );

    doc.moveDown(2);

    doc.strokeColor('#CCCCCC')
        .lineWidth(1)
        .moveTo(headerX, doc.y)
        .lineTo(headerX + contentWidth, doc.y)
        .stroke();

    doc.moveDown(4);
    doc.restore();
};

const addFooter = (doc) => {
    const pageMargin = doc.page.margins.left;
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.save();
    doc.strokeColor('#CCCCCC')
        .lineWidth(1)
        .moveTo(pageMargin, 740)
        .lineTo(pageMargin + contentWidth, 740)
        .stroke();
    doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#888888')
        .text(
            'This is a system-generated document. Thank you for your business.',
            pageMargin,
            750,
            {
                align: 'center',
                width: contentWidth,
            }
        );
    doc.restore();
};

const addInvoiceDetails = (doc, title, invoice, customer, items) => {
    const pageMargin = doc.page.margins.left;
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const primaryColor = '#003366';
    const secondaryColor = '#F0F0F0';
    const fontColor = '#000000';
    const headerFontColor = '#FFFFFF';
    const lightLineColor = '#EEEEEE';

    doc.save();
    doc.font('Helvetica');

    doc.fontSize(22)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text(title.toUpperCase(), pageMargin, 160, { align: 'left' });

    doc.moveDown(1.5);

    const infoTopY = doc.y;
    const halfWidth = contentWidth / 2 - 10;

    doc.fillColor(fontColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Billed To:', pageMargin, infoTopY);
    doc.font('Helvetica')
        .text(customer.name, pageMargin, doc.y)
        .text(customer.email, pageMargin, doc.y);

    const invoiceDetailsX = pageMargin + halfWidth + 20;
    doc.fontSize(10)
        .font('Helvetica-Bold')
        .text('Invoice Number:', invoiceDetailsX, infoTopY, {
            width: halfWidth,
            align: 'left',
        })
        .font('Helvetica')
        .text(invoice.invoiceNo, invoiceDetailsX + 100, infoTopY, {
            align: 'left',
        });

    doc.font('Helvetica-Bold')
        .text('Issue Date:', invoiceDetailsX, doc.y, {
            width: halfWidth,
            align: 'left',
        })
        .font('Helvetica')
        .text(
            invoice.issuedAt.toISOString().split('T')[0],
            invoiceDetailsX + 100,
            doc.y - 12,
            { align: 'left' }
        );

    doc.font('Helvetica-Bold')
        .text('Status:', invoiceDetailsX, doc.y, {
            width: halfWidth,
            align: 'left',
        })
        .font('Helvetica-Bold')
        .fillColor(invoice.status === 'PAID' ? '#006400' : '#C00000')
        .text(invoice.status, invoiceDetailsX + 100, doc.y - 12, {
            align: 'left',
        });

    doc.fillColor(fontColor);
    doc.moveDown(2);

    doc.strokeColor(lightLineColor)
        .lineWidth(1)
        .moveTo(pageMargin, doc.y)
        .lineTo(pageMargin + contentWidth, doc.y)
        .stroke();

    doc.moveDown(2);

    const tableTopY = doc.y;

    const itemColX = pageMargin + 10;
    const itemColWidth = contentWidth * 0.7;
    const amountColX = pageMargin + itemColWidth + 10;
    const amountColWidth = contentWidth - itemColWidth - 20;

    doc.rect(pageMargin, tableTopY, contentWidth, 25)
        .fill(primaryColor)
        .stroke(primaryColor);

    doc.fillColor(headerFontColor)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Item Description', itemColX, tableTopY + 7, {
            width: itemColWidth,
        })
        .text('Amount', amountColX, tableTopY + 7, {
            width: amountColWidth,
            align: 'right',
        });

    doc.fillColor(fontColor).font('Helvetica');
    let y = tableTopY + 25;

    items.forEach((item, i) => {
        const rowY = y + i * 30;
        doc.rect(pageMargin, rowY, contentWidth, 30)
            .fill(i % 2 ? secondaryColor : '#FFFFFF')
            .stroke('#FFFFFF');
        doc.fontSize(10)
            .text(item.description, itemColX, rowY + 10, { width: itemColWidth })
            .text(item.amount, amountColX, rowY + 10, {
                width: amountColWidth,
                align: 'right',
            });
    });

    y += items.length * 30 + 10;

    doc.strokeColor(lightLineColor)
        .lineWidth(1)
        .moveTo(pageMargin, y)
        .lineTo(pageMargin + contentWidth, y)
        .stroke();
    y += 10;

    const totalY = y;
    const totalRectWidth = 270;
    const totalRectX = pageMargin + contentWidth - totalRectWidth;

    doc.rect(totalRectX, totalY, totalRectWidth, 30)
        .fill(primaryColor)
        .stroke(primaryColor);

    doc.fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(headerFontColor)
        .text(
            'Total Amount Due:',
            totalRectX,
            totalY + 8,
            { width: totalRectWidth - 90, align: 'right' }
        );
    doc.fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(headerFontColor)
        .text(
            `${invoice.amount} ${invoice.currency}`,
            totalRectX + 170,
            totalY + 8,
            { width: 90, align: 'right' }
        );

    doc.fillColor(fontColor);

    doc.restore();
};

const generateB2CInvoicePDF = (
    invoice,
    purchase,
    user,
    issuer,
    ticketDefinition,
    logoBuffer
) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    addHeader(doc, issuer, logoBuffer);

    const customer = {
        name: user.name,
        email: user.email,
    };

    const items = [
        {
            description: `Event: ${purchase.event.name}\nTicket: ${ticketDefinition.name}`,
            amount: `${purchase.amount} ${invoice.currency}`,
        },
    ];

    addInvoiceDetails(doc, 'INVOICE (Ticket Purchase)', invoice, customer, items);

    addFooter(doc);

    return generatePdfBuffer(doc);
};

const generateB2BInvoicePDF = (
    invoice,
    booking,
    organizer,
    issuer,
    logoBuffer
) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    addHeader(doc, issuer, logoBuffer);

    const customer = {
        name: `${organizer.name} (Organizer)`,
        email: organizer.email,
    };

    const items = [
        {
            description: `Event: ${booking.event.name}\nVenue: ${booking.venue.name}\nTotal Cost: ${booking.calculatedCost} ZAR`,
            amount: `${invoice.amount} ${invoice.currency}`,
        },
    ];

    addInvoiceDetails(doc, 'INVOICE (Venue Booking)', invoice, customer, items);

    addFooter(doc);

    return generatePdfBuffer(doc);
};

module.exports = {
    generateB2CInvoicePDF,
    generateB2BInvoicePDF,
};