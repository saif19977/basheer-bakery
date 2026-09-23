import { useState } from 'react';
import { Send, Tag } from 'lucide-react';
import { Modal } from './ui/Modal';
import { useAppContext } from '../context/AppContext';
import { useCustomerNotes } from '../hooks/useCustomerNotes';
import { useSubmitLock } from '../hooks/useSubmitLock';
import { addCustomerNote } from '../services/customersService';
import { formatDate, formatOrderNum } from '../utils/format';

// خط زمني دائم لملاحظات/محادثات عميل واحد، قابل للفتح من قاعدة العملاء (بلا
// طلب محدد) أو من صف طلب معيّن (فتُربط الملاحظة الجديدة بذلك الطلب تحديداً).
export const CustomerNotesModal = ({ isOpen, onClose, customerId, customerName, order }) => {
  const { user, myProfile, showNotification } = useAppContext();
  const notes = useCustomerNotes(isOpen ? customerId : null);
  const [text, setText] = useState('');
  const submitLock = useSubmitLock();

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitLock.isLocked()) return;
    submitLock.lock();
    try {
      await addCustomerNote({
        customerId, orderId: order?.id, text: trimmed,
        authorUid: user.uid, authorName: myProfile?.name,
      });
      setText('');
    } catch (err) {
      console.error(err);
      showNotification('❌ تعذّر حفظ الملاحظة، حاول مرة أخرى.');
    } finally {
      submitLock.unlock();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`سجل المحادثات: ${customerName || 'عميل'}`} maxWidth="max-w-lg">
      <div className="space-y-4">
        <form onSubmit={handleAdd} className="space-y-2">
          {order && (
            <p className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-2 py-1 inline-flex items-center gap-1">
              <Tag size={12} /> ستُربط هذه الملاحظة بالطلب #{formatOrderNum(order)}
            </p>
          )}
          <div className="flex gap-2">
            <textarea
              value={text} onChange={e => setText(e.target.value)} rows="2"
              placeholder="أضف ملاحظة، طلباً خاصاً، أو ملخص مكالمة..."
              className="flex-1 p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button type="submit" disabled={submitLock.isProcessing || !text.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 rounded-lg flex items-center justify-center shrink-0">
              <Send size={18} />
            </button>
          </div>
        </form>

        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
          {notes.map(n => (
            <div key={n.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.text}</p>
              <div className="flex justify-between items-center mt-2 text-[10px] text-gray-500">
                <span className="font-bold">{n.authorName}</span>
                <div className="flex items-center gap-2">
                  {n.orderId && <span className="font-mono bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">طلب #{String(n.orderId).slice(0, 6).toUpperCase()}</span>}
                  <span>{formatDate(n.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
          {notes.length === 0 && <p className="text-sm text-gray-400 text-center py-6">لا توجد ملاحظات بعد لهذا العميل.</p>}
        </div>
      </div>
    </Modal>
  );
};
