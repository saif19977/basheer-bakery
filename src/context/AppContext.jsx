import { createContext, useContext } from 'react';

// يحمل هذا الـ Context كل البيانات الحيّة (طلبات، مخزون، ملفات تعريف...) والدوال
// المشتركة (إشعارات، طباعة، تكبير صورة...) بحيث لا تحتاج كل شاشة لتمريرها يدوياً.
export const AppContext = createContext(null);

export const useAppContext = () => useContext(AppContext);
