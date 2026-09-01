import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '../../constants/orderStatus';

export const StatusBadge = ({ status }) => (
  <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide whitespace-nowrap ${ORDER_STATUS_STYLES[status] || 'bg-gray-100'}`}>
    {ORDER_STATUS_LABELS[status] || status}
  </span>
);
