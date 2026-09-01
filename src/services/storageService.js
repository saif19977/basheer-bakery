import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import { compressImage } from '../utils/image';

const UPLOAD_TIMEOUT_MS = 4000;
const FALLBACK_MAX_WIDTH = 400;

const buildImagePath = () => `images/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

const uploadCompressedImage = async (base64DataUrl) => {
  const storageRef = ref(storage, buildImagePath());
  await uploadString(storageRef, base64DataUrl, 'data_url');
  return getDownloadURL(storageRef);
};

// يضغط الصورة ثم يرفعها إلى Firebase Storage، مع مهلة قصوى لتفادي تعليق الواجهة
// على اتصال بطيء. عند فشل الرفع أو انتهاء المهلة، يُعاد المحاولة بصورة أصغر
// كخطة بديلة بدل ترك المستخدم بلا نتيجة.
export async function uploadImageToStorage(file) {
  try {
    const base64DataUrl = await compressImage(file, 800);
    if (!base64DataUrl) return null;

    const uploadPromise = uploadCompressedImage(base64DataUrl);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), UPLOAD_TIMEOUT_MS)
    );

    return await Promise.race([uploadPromise, timeoutPromise]);
  } catch (error) {
    console.error('Storage Error or Timeout:', error);
    return await compressImage(file, FALLBACK_MAX_WIDTH);
  }
}
