import { Table } from '../../components/ui/Table';
import { formatMoney, formatOrderNum } from '../../utils/format';
import { PAYMENT_TYPE_BADGE_CLASS } from '../../constants/paymentTypes';

// سجل مخصَّص للطلبات الآجلة والجزئية ذات المبالغ المتبقية حالياً — يعتمد على
// نفس مصدر creditOrders غير المحدود (remainingDebt > 0) المستخدَم أصلاً في
// تبويب "الديون والذمم"، بلا أي استعلام جديد: طلب نقدي لا يمكن أن يحمل
// remainingDebt > 0 إطلاقاً (computePaymentSplit يُصفّره دائماً للنقد)، لذا
// هذه القائمة تتضمن حصراً طلبات "جزئي" أو "آجل" بالتعريف، تماماً كما طُلب.
// الفرق عن تبويب الديون: عرض مُركَّز على القراءة (بلا إجراء تحصيل) يوضّح
// الإجمالي والمدفوع والمتبقي معاً لكل طلب في مكان واحد.
export const CreditLedgerTab = ({ creditOrders }) => {
  const sorted = [...creditOrders].sort((a, b) => Number(b.remainingDebt || 0) - Number(a.remainingDebt || 0));
  const totalOutstanding = sorted.reduce((sum, o) => sum + Number(o.remainingDebt || 0), 0);

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex flex-col md:flex-row justify-between md:items-center gap-2">
        <span className="text-sm font-bold text-red-900">إجمالي المتبقي على كل الطلبات الآجلة والجزئية ({sorted.length} طلباً)</span>
        <span className="text-2xl font-bold text-red-700">{formatMoney(totalOutstanding)} IQD</span>
      </div>

      <Table headers={['رقم الطلب', 'اسم العميل', 'نوع الدفع', 'المبلغ الإجمالي', 'المبلغ المدفوع', 'المتبقي (الدين)']}>
        {sorted.map(o => (
          <tr key={o.id} className="hover:bg-gray-50">
            <td className="p-4 font-mono text-xs font-bold text-gray-500">#{formatOrderNum(o)}</td>
            <td className="p-4 font-bold text-sm text-gray-800">{o.customerName || 'غير محدد'}</td>
            <td className="p-4">
              <span className={`text-xs border px-2 py-0.5 rounded font-bold ${PAYMENT_TYPE_BADGE_CLASS[o.paymentType] || 'bg-gray-50 text-gray-600'}`}>{o.paymentType || '-'}</span>
            </td>
            <td className="p-4 font-bold text-gray-800">{formatMoney(o.price)} IQD</td>
            <td className="p-4 font-bold text-green-700">{formatMoney(o.paidAmount)} IQD</td>
            <td className="p-4 font-bold text-red-600">{formatMoney(o.remainingDebt)} IQD</td>
          </tr>
        ))}
        {sorted.length === 0 && (
          <tr><td colSpan="6" className="p-6 text-center text-gray-400">لا توجد طلبات آجلة أو جزئية بها مبالغ متبقية حالياً.</td></tr>
        )}
      </Table>
    </div>
  );
};
