import { InvoiceOrProductionPrint } from './InvoiceOrProductionPrint';
import { SalesReportPrint } from './SalesReportPrint';
import { FinanceReportPrint } from './FinanceReportPrint';

// يختار قالب الطباعة المناسب حسب نوع الطلب المطلوب طباعته حالياً.
export const PrintSection = ({ printData }) => {
  if (!printData) return null;

  switch (printData.printType) {
    case 'production':
    case 'invoice':
      return <InvoiceOrProductionPrint printData={printData} />;
    case 'sales_report':
      return <SalesReportPrint printData={printData} />;
    case 'finance_report':
      return <FinanceReportPrint printData={printData} />;
    default:
      return null;
  }
};
