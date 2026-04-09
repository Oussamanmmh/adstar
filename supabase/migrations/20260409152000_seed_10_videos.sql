-- Seed 10 active videos for rating flow.
-- This migration is idempotent by youtube_url.

insert into public.videos
    (title, youtube_url, thumbnail_url, order_index, is_active)
select v.title, v.youtube_url, v.thumbnail_url, v.order_index, true
from (
  values
        ('مقدمة في التسويق الرقمي', 'https://www.youtube.com/watch?v=HAnw168huqA', 'https://img.youtube.com/vi/HAnw168huqA/maxresdefault.jpg', 1),
        ('أساسيات إدارة الوقت', 'https://www.youtube.com/watch?v=iONDebHX9qk', 'https://img.youtube.com/vi/iONDebHX9qk/maxresdefault.jpg', 2),
        ('تحسين الإنتاجية اليومية', 'https://www.youtube.com/watch?v=QK8mJJJvaes', 'https://img.youtube.com/vi/QK8mJJJvaes/maxresdefault.jpg', 3),
        ('كيف تبدأ مشروعك الأول', 'https://www.youtube.com/watch?v=ZXsQAXx_ao0', 'https://img.youtube.com/vi/ZXsQAXx_ao0/maxresdefault.jpg', 4),
        ('مهارات التواصل الفعال', 'https://www.youtube.com/watch?v=I8jB2b0QfWQ', 'https://img.youtube.com/vi/I8jB2b0QfWQ/maxresdefault.jpg', 5),
        ('الذكاء الاصطناعي ببساطة', 'https://www.youtube.com/watch?v=2ePf9rue1Ao', 'https://img.youtube.com/vi/2ePf9rue1Ao/maxresdefault.jpg', 6),
        ('التخطيط المالي الشخصي', 'https://www.youtube.com/watch?v=HQzoZfc3GwQ', 'https://img.youtube.com/vi/HQzoZfc3GwQ/maxresdefault.jpg', 7),
        ('استراتيجيات التعلم السريع', 'https://www.youtube.com/watch?v=IlU-zDU6aQ0', 'https://img.youtube.com/vi/IlU-zDU6aQ0/maxresdefault.jpg', 8),
        ('بناء عادات ناجحة', 'https://www.youtube.com/watch?v=AdKUJxjn-R8', 'https://img.youtube.com/vi/AdKUJxjn-R8/maxresdefault.jpg', 9),
        ('مفاتيح النجاح المهني', 'https://www.youtube.com/watch?v=mgmVOuLgFB0', 'https://img.youtube.com/vi/mgmVOuLgFB0/maxresdefault.jpg', 10)
) as v(title, youtube_url, thumbnail_url, order_index)
where not exists (
  select 1
from public.videos existing
where existing.youtube_url = v.youtube_url
);
