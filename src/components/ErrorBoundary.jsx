import React from 'react';

// صائد الأخطاء لمنع الشاشة البيضاء: يلتقط أي خطأ برمجي في الشجرة تحته
// ويعرض رسالة عربية ودّية بدل انهيار التطبيق بالكامل.
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorInfo: error.toString() };
  }

  componentDidCatch(error, errorInfo) {
    console.error('تم اصطياد خطأ:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 m-8 bg-red-50 border-2 border-red-500 rounded-xl text-right" dir="rtl">
          <h2 className="text-2xl font-bold text-red-700 mb-4">⚠️ عذراً، حدث خطأ برمجي في هذه الصفحة!</h2>
          <p className="text-gray-700 mb-2">تم منع انهيار النظام بالكامل. يرجى إرسال الخطأ أدناه للمبرمج:</p>
          <div className="bg-white p-4 rounded border border-red-200 text-left dir-ltr font-mono text-sm text-red-600 overflow-auto">
            {this.state.errorInfo}
          </div>
          <button onClick={() => window.location.reload()} className="mt-4 bg-red-600 text-white px-4 py-2 rounded font-bold">تحديث الصفحة</button>
        </div>
      );
    }
    return this.props.children;
  }
}
