import { X } from 'lucide-react';

export const ImageZoomOverlay = ({ image, onClose }) => {
  if (!image) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 cursor-pointer" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"><X size={32} /></button>
      <img src={image} className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl" alt="zoomed" />
    </div>
  );
};
