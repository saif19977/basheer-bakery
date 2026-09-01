export const StatCard = (props) => {
  const { title, value, icon: Icon, colorClass, onClick, subtitle } = props;
  return (
    <div onClick={onClick} className={`bg-white p-6 rounded-xl border border-gray-100 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow hover:border-amber-200' : 'shadow-sm'}`}>
      <div className={`p-4 rounded-lg flex-shrink-0 ${colorClass}`}><Icon size={28} /></div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};
