// ضغط الصور على جهاز العميل قبل رفعها (لتسريع الرفع وتقليل حجم التخزين).
export const compressImage = (file, maxWidth = 800) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scaleSize = maxWidth / img.width;
        canvas.width = img.width > maxWidth ? maxWidth : img.width;
        canvas.height = img.width > maxWidth ? img.height * scaleSize : img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = () => resolve(null);
      img.src = event.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};
