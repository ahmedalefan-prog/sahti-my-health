import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, patientContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build system prompt with patient data
    let systemPrompt = `أنت مساعد صحي ذكي اسمك "سالم". تتحدث بالعربية دائماً بلغة بسيطة ومشجعة.`;

    if (patientContext) {
      const p = patientContext;
      const g = p.gender === 'female' ? 'ة' : '';
      const gPoss = p.gender === 'female' ? 'ها' : 'ه';
      systemPrompt = `أنت مساعد صحي ذكي اسمك "سالم" لمريض${g} اسم${gPoss} ${p.name || 'المستخدم'}،
عمر${gPoss} ${p.age || '?'} سنة، ${p.gender === 'female' ? 'أنثى' : 'ذكر'}،
طول${gPoss} ${p.height || '?'} سم، وزن${gPoss} ${p.weight || '?'} كغ،
فصيلة دم${gPoss} ${p.bloodType || '?'}، BMI: ${p.bmi || '?'}.
أمراض${gPoss} المزمنة: ${p.conditions || 'لا يوجد'}.
أمراض إضافية: ${p.customConditions || 'لا يوجد'}.
عمليات جراحية / زراعة أعضاء: ${p.surgeries || 'لا يوجد'}.
طبيب${gPoss} المعالج: ${p.doctorName || 'غير محدد'}.
السعرات اليومية المطلوبة: ${p.dailyCalories || '?'}.

آخر نتائج تحاليل${gPoss}:
${p.labSummary || 'لا توجد تحاليل'}

أدوية${gPoss} الحالية:
${p.medSummary || 'لا توجد أدوية'}`;
    }

    systemPrompt += `

قواعدك:
1. تكلم بالعربية دائماً بلغة بسيطة ومشجعة
2. لا تعطِ تشخيصاً طبياً قاطعاً أبداً
3. دائماً شجع على مراجعة الطبيب للأمور المهمة
4. ردودك منظمة ومختصرة (لا تطول أكثر من اللازم)
5. استخدم الرموز التعبيرية لتجميل الردود
6. أنت تعرف بيانات المريض${patientContext?.gender === 'female' ? 'ة' : ''} الكاملة المذكورة أعلاه

عند إنشاء أي تقرير طبي أو ملخص صحي، يجب أن يشمل التقرير جميع الأقسام التالية بالترتيب:
✅ معلومات المريض (الاسم، العمر، الجنس، الوزن، الطول، BMI، فصيلة الدم، الطبيب المعالج)
✅ الأدوية ونسبة الالتزام (كل دواء مع جرعته وتكراره ونسبة الالتزام)
✅ نتائج التحاليل (كل التحاليل مع قيمها ووحداتها وحالتها طبيعي/خارج النطاق)
✅ مقارنة التحاليل قبل وبعد (إذا يوجد تاريخين)
✅ الرسوم البيانية (وصف نصي للتغيرات)
✅ النظام الغذائي (ملخص السعرات والعناصر الغذائية خلال الفترة)
✅ اليوميات والملاحظات (ملخص المزاج والأعراض)
✅ الأعراض الجانبية للأدوية إن وجدت
رتّب التقرير بهذا الترتيب وأضف فاصلاً واضحاً بين كل قسم.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز الحد المسموح، حاول بعد قليل ⏳" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "يرجى إضافة رصيد للاستمرار في استخدام المساعد الذكي" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "حدث خطأ في الاتصال بالذكاء الاصطناعي" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("health-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
