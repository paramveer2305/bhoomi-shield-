import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ParcelReportData {
  parcel: any;
  timeline: any[];
  documents_count: number;
  risk_analysis: any;
  generated_at: string;
}

export const generateParcelPDFReport = (data: ParcelReportData): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Header with logo placeholder and title
  doc.setFillColor(67, 56, 202); // Primary color
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('BHOOMI SHIELD', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Land Dispute Early Warning & Cadastral Risk Intelligence System', pageWidth / 2, 30, { align: 'center' });

  yPosition = 50;

  // Report title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`Comprehensive Parcel Report`, 14, yPosition);

  yPosition += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date(data.generated_at).toLocaleString()}`, 14, yPosition);
  doc.text(`Report Type: COMPREHENSIVE_PARCEL_REPORT`, pageWidth - 14, yPosition, { align: 'right' });

  yPosition += 15;

  // Parcel Information Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Parcel Information', 14, yPosition);
  yPosition += 8;

  const parcelData = [
    ['Parcel ID', data.parcel.parcel_id],
    ['Survey Number', data.parcel.survey_number],
    ['Owner Name', data.parcel.owner_name],
    ['Location', `${data.parcel.village}, ${data.parcel.tehsil}, ${data.parcel.district}`],
    ['Area', `${data.parcel.area} sq m`],
    ['Land Type', data.parcel.land_type],
    ['Status', data.parcel.status],
    ['Coordinates', data.parcel.latitude && data.parcel.longitude
      ? `${data.parcel.latitude.toFixed(6)}, ${data.parcel.longitude.toFixed(6)}`
      : 'Not available'],
    ['Registered On', new Date(data.parcel.created_at).toLocaleDateString()],
    ['Last Updated', new Date(data.parcel.updated_at).toLocaleDateString()],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: parcelData,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 'auto' },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Risk Analysis Section
  if (data.risk_analysis) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Risk Intelligence Analysis', 14, yPosition);
    yPosition += 8;

    const riskData = [
      ['Risk Score', `${data.risk_analysis.risk_score}/100`],
      ['Risk Level', data.risk_analysis.risk_level],
      ['Trend', data.risk_analysis.trend || 'STABLE'],
      ['Analysis Date', new Date(data.risk_analysis.timestamp).toLocaleDateString()],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: riskData,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 'auto' },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Risk Signals
    if (data.risk_analysis.risk_signals && data.risk_analysis.risk_signals.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Identified Risk Signals:', 14, yPosition);
      yPosition += 6;

      const riskSignals = data.risk_analysis.risk_signals.map((signal: any, index: number) => [
        `${index + 1}.`,
        signal.signal_type,
        signal.severity,
        signal.description.substring(0, 60) + (signal.description.length > 60 ? '...' : ''),
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['#', 'Type', 'Severity', 'Description']],
        body: riskSignals,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [239, 68, 68], textColor: 255 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }
  }

  // Document Summary
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Document Summary', 14, yPosition);
  yPosition += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Documents Attached: ${data.documents_count}`, 14, yPosition);
  yPosition += 15;

  // Timeline Events
  if (data.timeline && data.timeline.length > 0) {
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Activity Timeline', 14, yPosition);
    yPosition += 8;

    const timelineData = data.timeline.slice(0, 10).map((event: any) => [
      new Date(event.timestamp).toLocaleDateString(),
      event.event_type,
      event.title,
      event.actor || 'SYSTEM',
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Event Type', 'Title', 'Actor']],
      body: timelineData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [67, 56, 202], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 40 },
        2: { cellWidth: 70 },
        3: { cellWidth: 30 },
      },
    });
  }

  // Footer with disclaimer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Page number
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

    // Legal disclaimer on last page
    if (i === pageCount) {
      const disclaimerY = doc.internal.pageSize.getHeight() - 30;
      doc.setFillColor(240, 240, 240);
      doc.rect(10, disclaimerY - 5, pageWidth - 20, 20, 'F');

      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'italic');
      doc.text(
        'LEGAL DISCLAIMER: This report is generated by Bhoomi Shield AI Risk Intelligence System for informational purposes only.',
        pageWidth / 2,
        disclaimerY,
        { align: 'center', maxWidth: pageWidth - 30 }
      );
      doc.text(
        'All data should be independently verified. This report does not constitute legal advice or official cadastral certification.',
        pageWidth / 2,
        disclaimerY + 5,
        { align: 'center', maxWidth: pageWidth - 30 }
      );
    }
  }

  // Save the PDF
  const filename = `Bhoomi-Shield-Report-${data.parcel.parcel_id}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};
