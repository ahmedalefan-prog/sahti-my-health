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
    const { pdfText, gender } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!pdfText || typeof pdfText !== "string" || pdfText.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "النص المستخرج من الملف قصير جداً أو فارغ" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `أنت خبير في استخراج نتائج التحاليل المخبرية من نصوص تقارير PDF.

مهمتك: استخرج جميع نتائج التحاليل من النص المعطى وأرجعها بصيغة JSON.

قواعد مهمة:
1. استخرج فقط التحاليل الفعلية (لا تستخرج عمر المريض أو رقم الهوية كقيم تحاليل)
2. حدد الحالة (status) بناءً على المرجع الطبيعي: normal أو warning أو danger
3. إذا وجدت اسم المريض أو الجنس أو العمر أو تاريخ العينة، استخرجها أيضاً
4. الجنس المعروف للمريض: ${gender === "female" ? "أنثى" : gender === "male" ? "ذكر" : "غير محدد"}
5. استخدم المرجع الطبيعي حسب الجنس إذا كان متاحاً

أرجع النتيجة كـ JSON فقط بدون أي نص إضافي بهذا الشكل:
{
  "patientName": "اسم المريض أو null",
  "gender": "male" أو "female" أو null,
  "age": رقم أو null,
  "sampleDate": "YYYY-MM-DD",
  "results": [
    {
      "key": "مفتاح التحليل بالإنجليزية مثل wbc, rbc, hgb, plt, fbs, creatinine, etc",
      "arabicName": "اسم التحليل بالعربية",
      "englishName": "اسم التحليل بالإنجليزية",
      "value": رقم القيمة,
      "unit": "الوحدة",
      "normalMin": الحد الأدنى الطبيعي,
      "normalMax": الحد الأعلى الطبيعي,
      "status": "normal" أو "warning" أو "danger"
    }
  ]
}`;

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
            { role: "user", content: `استخرج التحاليل من هذا النص:\n\n${pdfText.substring(0, 8000)}` },
          ],
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
          JSON.stringify({ error: "يرجى إضافة رصيد للاستمرار" }),
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

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      console.error("Failed to parse AI response as JSON:", content);
      return new Response(
        JSON.stringify({ error: "لم يتمكن الذكاء الاصطناعي من استخراج النتائج بشكل صحيح" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    console.error("parse-lab-pdf error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
