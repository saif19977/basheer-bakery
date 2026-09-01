import { Image as ImageIcon } from 'lucide-react';
import { formatDate, formatMoney, formatOrderNum } from '../utils/format';
import { getItemDisplayName, getItemImages, getOrderItems } from '../utils/orderItems';

// نفس القالب يُستخدم لتذكرة عمل المعمل (بلا أسعار) وفاتورة العميل (بالسعر)،
// يتحكم isProductionPrint في الفروقات بين الاثنين.
export const InvoiceOrProductionPrint = ({ printData }) => {
  const isProductionPrint = printData.printType === 'production';

  return (
    <div className="print-section hidden print:block text-right dir-rtl font-sans p-8 mx-auto max-w-2xl bg-white border-2 border-dashed border-gray-300">
      <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
        <h1 className="text-4xl font-serif text-slate-800 font-bold mb-1">BASHEER ALSHAKARCHY</h1>
        <p className="text-sm font-semibold tracking-widest text-slate-500 uppercase">Sweets & Cake</p>
        <p className="mt-6 text-xl font-bold bg-gray-100 inline-block px-6 py-2 rounded-lg border border-gray-200">
          {isProductionPrint ? 'تذكرة عمل رقم:' : 'فاتورة طلب رقم:'} #{formatOrderNum(printData)}
        </p>
      </div>

      <div className="space-y-4 text-lg">
        {isProductionPrint ? (
          <div className="bg-gray-100 p-4 rounded-lg text-center mb-4 border border-gray-300">
            <p className="font-bold text-xl text-gray-800">قسم الإنتاج - المعمل</p>
            <p className="text-sm mt-2 text-red-600 font-bold">موعد التسليم المطلوب: {formatDate(printData.deliveryDate)}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border">
              <p><strong>العميل:</strong> {printData.customerName || 'غير محدد'}</p>
              <p><strong>الهاتف:</strong> <span className="dir-ltr inline-block font-mono">{printData.phone || '-'}</span></p>
            </div>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border">
              <p><strong>العنوان:</strong> {printData.address || '-'}</p>
              <p><strong>طريقة الدفع والتواصل:</strong> {printData.paymentType || 'نقد'} / {printData.contactMethod || 'مباشر'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p><strong>موعد التسليم للزبون:</strong> {formatDate(printData.deliveryDate)}</p>
            </div>
          </>
        )}

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="font-bold mb-3 border-b pb-2">تفاصيل الأصناف المطلوبة:</p>
          <div className="space-y-4">
            {getOrderItems(printData).map((i, idx) => {
              const itemImages = getItemImages(i);
              return (
                <div key={idx} className="flex gap-4 items-start border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex gap-2 flex-wrap max-w-[120px]">
                    {itemImages.map((img, imgIdx) => (
                      <img key={imgIdx} src={img} className="w-16 h-16 object-cover rounded border border-gray-300" alt="item" />
                    ))}
                    {itemImages.length === 0 && (
                      <div className="w-16 h-16 bg-gray-100 border rounded flex items-center justify-center text-gray-300"><ImageIcon size={24} /></div>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="font-bold text-lg">{i.quantity}x {getItemDisplayName(i)}</p>
                    <p className="text-sm text-gray-600 mb-1">الحجم: {i.cakeSize} {i.weight && ` | الوزن: ${i.weight}`}</p>
                    {i.itemNotes && <p className="text-sm bg-yellow-50 p-2 rounded border border-yellow-200 mt-2"><strong>ملاحظات:</strong> {i.itemNotes}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!isProductionPrint && (
          <p className="p-4 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xl font-bold text-center"><strong>الإجمالي المستحق للطلب:</strong> {formatMoney(printData.price)} IQD</p>
        )}

        {printData.notes && <p className="p-4 border rounded-lg bg-yellow-50"><strong>ملاحظات التوصيل:</strong> {printData.notes}</p>}
      </div>

      <div className="mt-8 text-center text-gray-500 text-sm border-t pt-4 border-gray-300">
        <p>تاريخ إصدار {isProductionPrint ? 'التذكرة' : 'الفاتورة'}: {new Date().toLocaleString('ar-IQ', { timeZone: 'Asia/Baghdad' })}</p>
        {!isProductionPrint && <p className="mt-2 font-bold text-gray-800">نتمنى لكم يوماً سعيداً مع بشير الشكرچي!</p>}
      </div>
    </div>
  );
};
