1) تعريف النظام
اسم النظام

Arabic Name-to-Image Generator

الهدف

نظام ويب يتيح للمستخدم إدخال:

الاسم
البريد الإلكتروني

ثم يقوم الخادم بـ:

أخذ الاسم فقط
دمجه داخل قالب صورة ثابت
تطبيق خط عربي محدد
إنتاج PNG عالي الدقة
عرض النتيجة للتحميل على الجوال أو المتصفح
نطاق الإصدار الأول
قالب واحد فقط
حقلان فقط: الاسم والبريد
إخراج واحد: PNG
دعم العربية
دعم الأسماء الطويلة
استخدام عام من عدة مستخدمين في نفس الوقت
2) القرارات المعمارية الأساسية
القرار 1: استخدام Next.js مع App Router

يعتمد النظام على App Router في Next.js، لأن Route Handlers متاحة داخل app directory وتعمل كطبقة API حديثة مبنية على Web Request/Response APIs، كما أن Next.js يدعم أيضًا Server Actions للتعامل مع الـ form submissions والـ mutations على الخادم.

القرار 2: توليد الصورة على الخادم

الرسم ومعالجة الصورة يجب أن يتمّا على الخادم وليس في المتصفح، لضمان:

ثبات النتيجة
التحكم الكامل في الخط العربي
توحيد جودة الإخراج
منع اختلاف النتائج بين الأجهزة والمتصفحات
القرار 3: اعتماد Route Handler لمسار التوليد

يوصى أن تكون عملية إنشاء الصورة في Route Handler مثل:
app/api/generate/route.ts

السبب:

مناسب لإرجاع ملف PNG أو URL أو JSON
أوضح في إدارة الأخطاء
مناسب لطلبات التحميل والتنزيل
أسهل عند إضافة rate limiting أو logging أو auth لاحقًا
القرار 4: Sharp + SVG text كخيار أول

من الناحية التنفيذية، أوصي بأن يكون Sharp هو الخيار الأول لتجميع الصورة، عبر composite مع طبقة نصية SVG فوق القالب، لأن Sharp يوفر pipeline واضحًا للتركيب compositing، ويضمن أن الـ overlays تكون بنفس الأبعاد أو أصغر من الصورة الأساسية مع تحكم جيد في التموضع.

القرار 5: Node Canvas كخيار بديل أو احتياطي

يمكن استخدام node-canvas إذا احتجت تحكمًا أدق في الرسم النصي، وهو Cairo-backed Canvas implementation for Node.js، ويتطلب Node 18.12.0 كحد أدنى وفق README الحالي. لكن يجب الانتباه إلى أن له تبعيات native وقد يزيد تعقيد النشر مقارنة ببعض سيناريوهات Sharp.

القرار 6: PostgreSQL اختياري

إذا كان حفظ البيانات مطلوبًا، فـ PostgreSQL مناسب كنظام قاعدة بيانات علائقية قوي ومفتوح المصدر لإدارة بيانات الطلبات والسجلات.

3) المتطلبات الوظيفية
3.1 مدخلات المستخدم
name الاسم
email البريد الإلكتروني
3.2 سلوك النظام
التحقق من الحقول
إرسال الطلب للخادم
إنشاء صورة جديدة من القالب الثابت
طباعة الاسم في مساحة محددة
إرجاع الصورة للمعاينة
إتاحة التحميل بصيغة PNG
3.3 مخرجات النظام
صورة PNG عالية الدقة
رابط تنزيل أو استجابة binary
اختياري: تخزين نسخة في object storage
4) المتطلبات غير الوظيفية
الأداء
زمن إنشاء الصورة: مستهدف 1–3 ثوانٍ في الأحمال الطبيعية
دعم عدة مستخدمين متزامنين
تقليل إعادة تحميل الخط والقالب قدر الإمكان
الاعتمادية
فشل واضح برسالة مفهومة إذا تعذر توليد الصورة
تسجيل logs للأخطاء
منع إنشاء ملفات ناقصة أو معطوبة
الجودة
دقة عالية مناسبة للجوال
مظهر ثابت للنص العربي
عدم تداخل الاسم مع العناصر الأخرى في التصميم
الأمان
التحقق من المدخلات
Rate limiting على endpoint
sanitation للاسم والبريد
عدم كشف ملفات الخطوط أو القوالب الحساسة بشكل غير مقصود
5) المعمارية المنطقية
[User Mobile/Desktop]
        |
        v
[Next.js Frontend]
  - Form
  - Preview
  - Download UI
        |
        v
[Route Handler / Server Action]
  - Input validation
  - Business rules
  - Image generation orchestration
        |
        +----------------------+
        |                      |
        v                      v
[Template + Font Source]   [PostgreSQL - optional]
(local/object storage)     (submissions/logs)
        |
        v
[Rendering Engine]
(Sharp or Node Canvas)
        |
        v
[PNG Output]
        |
        v
[Direct download / temporary storage / preview URL]
6) المكونات الرئيسية
6.1 الواجهة الأمامية Frontend
الصفحات
/
نموذج الإدخال
زر إنشاء
معاينة النتيجة
زر تحميل
المكونات
NameEmailForm
PreviewCard
DownloadButton
ErrorNotice
LoadingState
سلوك الواجهة
Mobile-first
منع submit للحقل الفارغ
إظهار loading state
عرض الخطأ في حال فشل الإنشاء
إظهار المعاينة بعد النجاح
6.2 طبقة التطبيق Application Layer
المسؤوليات
استقبال الطلب
التحقق من المدخلات
تطبيق قواعد العمل
استدعاء خدمة توليد الصورة
تخزين بيانات الطلب إذا كان الحفظ مطلوبًا
إرجاع response مناسب
الأنسب

استخدام Route Handler في الإصدار الأول، مع إمكانية استخدام Server Action لاحقًا إذا أردت ربط form submission بشكل مباشر بالخادم داخل App Router. Next.js يدعم كلا المسارين ضمن بنيته الحديثة.

6.3 محرك التوليد Rendering Engine
مسؤولياته
تحميل القالب
تحميل الخط
حساب موضع النص
احتواء الاسم داخل المساحة المحددة
إنشاء PNG نهائي
خيار التنفيذ A: Sharp

يتم:

قراءة الصورة الأساسية
إنشاء SVG يحتوي النص العربي
استخدام composite() لدمج طبقة النص فوق القالب
إخراج PNG
خيار التنفيذ B: Node Canvas

يتم:

إنشاء canvas بأبعاد القالب
رسم القالب
تحميل الخط
رسم النص في الموضع المحدد
إخراج PNG buffer
7) بنية المشروع المقترحة
project-root/
├─ app/
│  ├─ page.tsx
│  ├─ api/
│  │  └─ generate/
│  │     └─ route.ts
│  └─ components/
│     ├─ NameEmailForm.tsx
│     ├─ PreviewCard.tsx
│     ├─ DownloadButton.tsx
│     └─ ErrorNotice.tsx
│
├─ lib/
│  ├─ validation/
│  │  └─ submission.ts
│  ├─ image/
│  │  ├─ generate-image.ts
│  │  ├─ render-with-sharp.ts
│  │  ├─ render-with-canvas.ts
│  │  ├─ text-layout.ts
│  │  └─ template-config.ts
│  ├─ db/
│  │  ├─ client.ts
│  │  └─ submissions.ts
│  └─ storage/
│     ├─ local-storage.ts
│     └─ object-storage.ts
│
├─ public/
│  └─ assets/
│     ├─ templates/
│     │  └─ main-template.png
│     └─ fonts/
│        └─ arabic-font.ttf
│
├─ prisma/
│  └─ schema.prisma
│
├─ types/
│  ├─ submission.ts
│  └─ image.ts
│
├─ .env
├─ next.config.js
├─ package.json
└─ README.md
8) تصميم الـ API
Endpoint رئيسي
POST /api/generate
Request body
{
  "name": "محمد أحمد",
  "email": "user@example.com"
}
Success response - خيار 1

يرجع JSON يحتوي رابطًا مؤقتًا للصورة:

{
  "success": true,
  "imageUrl": "/generated/abc123.png"
}
Success response - خيار 2

يرجع PNG مباشرة:

Content-Type: image/png
Content-Disposition: attachment; filename="generated-image.png"
Error response
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "الاسم غير صالح"
}
9) نموذج البيانات

إذا لم يكن حفظ البيانات مطلوبًا:

لا حاجة لقاعدة بيانات في الإصدار الأول

إذا كان حفظ البيانات مطلوبًا:

جدول submissions
id                UUID / BIGSERIAL
name              TEXT NOT NULL
email             TEXT NOT NULL
image_path        TEXT NULL
status            TEXT NOT NULL
error_message     TEXT NULL
created_at        TIMESTAMP NOT NULL
updated_at        TIMESTAMP NOT NULL
جدول generation_logs اختياري
id                UUID / BIGSERIAL
submission_id     FK
processing_ms     INTEGER
renderer          TEXT
template_version  TEXT
created_at        TIMESTAMP
الغرض من الحفظ
التتبع
التحليلات
إعادة تنزيل الصور
التدقيق
مراقبة نسب الفشل

PostgreSQL مناسب لهذه الحالة بوضوح لأنه نظام قاعدة بيانات علائقية قوي وقابل للتوسع للتعامل مع هذا النوع من الجداول والبيانات التشغيلية.

10) استراتيجية تخزين القالب والخط والصور
10.1 القالب والخط
خيار A: داخل المشروع
مناسب إذا:
يوجد قالب واحد
التغييرات نادرة
حجم الملفات محدود
المسار:
public/assets/templates
public/assets/fonts
خيار B: object storage
مناسب إذا:
قد يتغير القالب أو الخط لاحقًا
تريد إدارة الملفات خارج build
تحتاج بيئة إنتاج أكثر مرونة
10.2 الصور الناتجة
خيار A: عدم التخزين
توليد الصورة وإرجاعها مباشرة
أنسب إذا لم تكن بحاجة للأرشفة
خيار B: تخزين مؤقت
حفظ الصورة لفترة قصيرة
استخدام signed URL أو مسار مؤقت
خيار C: تخزين دائم
إذا كان الربط بالبريد أو السجل الإداري مطلوبًا
11) منطق احتواء الاسم داخل الصورة

هذه أهم طبقة عمل في النظام.

مدخلات layout engine
عرض المنطقة
ارتفاع المنطقة
موضع X/Y
المحاذاة
الخط
الحجم الابتدائي
الحد الأدنى للحجم
عدد الأسطر المسموح
قواعد المعالجة
إزالة المسافات الزائدة
التحقق من عدد الأحرف
محاولة الرسم بحجم افتراضي
قياس عرض النص
إذا تجاوز العرض:
تصغير الحجم تدريجيًا
إذا لم يكفِ:
تقسيمه إلى سطرين
إذا تجاوز سطرين:
إرجاع خطأ business rule
أو اعتماد سياسة truncation إذا وافقت عليها لاحقًا
سياسة مقترحة
maxLines = 2
baseFontSize = 72
minFontSize = 40
alignment = center
direction = rtl
12) إدارة النص العربي
المتطلبات
دعم RTL
دعم الخط العربي المحدد
اختبار الأسماء الطويلة
اختبار الأحرف المركبة
التوصية العملية
لا تربط نفسك الآن باسم الخط فقط
اعتمد ملف الخط الحقيقي TTF/OTF
اجعل الخط configurable
اجعل إعدادات المنطقة النصية خارج الكود
13) ملف إعدادات القالب
export const templateConfig = {
  template: {
    path: "public/assets/templates/main-template.png",
    width: 2400,
    height: 1600,
    outputFormat: "png"
  },
  nameArea: {
    x: 1200,
    y: 920,
    maxWidth: 1000,
    maxHeight: 220,
    align: "center",
    direction: "rtl",
    maxLines: 2
  },
  font: {
    path: "public/assets/fonts/arabic-font.ttf",
    color: "#1F1F1F",
    baseSize: 72,
    minSize: 40,
    lineHeight: 1.25
  }
} as const;
14) تدفق الطلب الكامل
1. User fills form
2. Frontend validates basic fields
3. POST /api/generate
4. Backend validates request
5. Optional: insert submission row
6. Load template + font
7. Compute text layout
8. Render PNG
9. Optional: upload PNG to storage
10. Optional: update DB row
11. Return image URL or binary response
12. Frontend shows preview + download
15) معالجة الأخطاء
أخطاء متوقعة
الاسم فارغ
البريد غير صالح
الاسم أطول من الحد المقبول
الخط غير موجود
القالب غير موجود
فشل في توليد الصورة
فشل في الرفع إلى storage
فشل في حفظ السجل بقاعدة البيانات
شكل التعامل
أخطاء التحقق: 400
أخطاء business rules: 422
أخطاء الخادم: 500
رسائل المستخدم
"يرجى إدخال الاسم"
"البريد الإلكتروني غير صحيح"
"الاسم طويل جدًا لهذا التصميم"
"حدث خطأ أثناء إنشاء الصورة، حاول مرة أخرى"
16) الأمان
مدخلات
trimming
length checks
email validation
منع payloads الضخمة
sanitation لأي نص قبل استخدامه
API
rate limiting
request size limit
logging
مراقبة محاولات الإساءة
Server Actions

إذا استخدمت Server Actions لاحقًا، فـ Next.js يطبق فحص origin/host لمنع بعض سيناريوهات CSRF، ويمكن أيضًا ضبط allowedOrigins عند الحاجة.

17) الأداء وقابلية التوسع
تحسينات مباشرة
cache للقالب داخل الذاكرة إذا كانت البيئة تسمح
cache لملف الخط
عدم إعادة حساب config في كل مرة
تقليل العمليات غير الضرورية قبل render
التوسع

لأن كل المستخدمين يستخدمون نفس القالب، فهذا يبسط التوسع بشكل كبير:

لا توجد إدارة معقدة لقوالب متعددة
لا توجد branching logic كثيرة
يمكن أفقيًا توسيع الخدمة بسهولة إذا زاد الضغط
18) قرار النشر
خيار موصى به
Next.js app
Route Handler
Sharp renderer
PostgreSQL فقط عند الحاجة للحفظ
Object storage إذا رغبت بالاحتفاظ بالصور
ملاحظة مهمة على node-canvas

node-canvas يعتمد على native dependencies وقد يكون أكثر حساسية في بيئات النشر، خاصة serverless أو بعض توزيعات Linux، لذلك إن كان الهدف هو تقليل احتكاك النشر، فابدأ بـ Sharp، واحتفظ بـ node-canvas كخيار fallback إذا احتجت تحكمًا أكثر تخصيصًا. دعم node-canvas الحالي يتطلب Node 18.12.0 على الأقل، مع binaries جاهزة لبعض المنصات فقط وفق README.

19) Blueprint تقني مختصر للـ MVP
الإصدار الأول
Frontend
صفحة واحدة
form
preview
download
Backend
POST /api/generate
validation
render
return result
Assets
قالب واحد
خط واحد
DB
بدون DB في البداية أو
جدول submissions فقط إذا كان الحفظ مطلوبًا
Storage
لا تخزين دائم في الإصدار الأول
أو تخزين مؤقت فقط
20) Blueprint تنفيذي على مراحل
المرحلة 1: Foundation
إنشاء مشروع Next.js App Router
إعداد Route Handler
وضع القالب والخط
بناء config ثابت
بناء renderer
المرحلة 2: Business Rules
validation
email check
text fitting
multi-line logic
RTL checks
المرحلة 3: UI
form
loading state
preview
download
المرحلة 4: Persistence
إضافة PostgreSQL إذا لزم
تسجيل submissions
حفظ status وimage_path
المرحلة 5: Production Hardening
rate limiting
logs
monitoring
storage strategy
retry handling
21) توصية نهائية

للنسخة العملية الأولى، أوصي بهذا الاختيار:

Next.js App Router
Route Handler لمسار التوليد
Sharp كخيار أول للرسم
Template + font داخل المشروع في البداية
PostgreSQL فقط إذا كان حفظ البيانات مطلوبًا من أول إصدار
Object storage لاحقًا إذا قررت الاحتفاظ بالصور أو مشاركتها عبر روابط

هذا المسار يحقق أقل تعقيد تشغيلي مع أفضل قابلية للتوسع في حالتك. دعم Next.js الحديث لـ Route Handlers وServer Actions موثق رسميًا، وSharp يوفر compositing مناسبًا لهذا النوع من الاستخدام، بينما PostgreSQL خيار قوي وواضح إذا انتقل النظام من مجرد توليد لحظي إلى نظام يحتفظ بسجل الطلبات.

أستطيع في الرسالة التالية أن أحوّل هذا الـ blueprint إلى Technical Specification كاملة تشمل:

schema لقاعدة البيانات
API contract مفصل
folder structure نهائي
sequence diagram
pseudo-code لمحرك توليد الصورة العربي