// QS Empire Daily Cron Job
// Runs every day at 8 AM Dubai time (4 AM UTC)
export default async function handler(req, res) {
  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const OWNER_EMAIL = process.env.OWNER_EMAIL || 'basel.omar.qs@gmail.com';

  console.log('🚀 QS Empire Daily Job Started');

  try {
    // 1. Search for opportunities
    const searchQueries = [
      'Quantity Surveyor freelance job Upwork site:upwork.com',
      'BOQ cost estimation freelancer site:freelancer.com',
      'quantity takeoff remote work',
      'حصر كميات مستقل',
      'construction estimator freelance'
    ];

    const allResults = [];
    
    for (const query of searchQueries) {
      try {
        const searchResponse = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: TAVILY_API_KEY,
            query: query,
            search_depth: 'basic',
            max_results: 5
          })
        });
        
        const searchData = await searchResponse.json();
        if (searchData.results) {
          allResults.push(...searchData.results);
        }
      } catch (e) {
        console.error('Search query error:', e);
      }
    }

    // Remove duplicates
    const uniqueResults = allResults.filter((item, index, self) =>
      index === self.findIndex(t => t.url === item.url)
    );

    console.log(`Found ${uniqueResults.length} unique results`);

    // 2. Analyze with AI
    const opportunities = [];
    
    for (const result of uniqueResults.slice(0, 15)) {
      try {
        const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { 
                role: 'system', 
                content: `أنت محلل فرص عمل لـ Quantity Surveyor خبير (+10 سنوات، 300+ مشروع، معتمد بلدية دبي G+4).
رد بـ JSON فقط:
{
  "isRelevant": true/false,
  "title": "عنوان مختصر بالعربي",
  "platform": "Upwork/Freelancer/Mostaql/Fiverr/LinkedIn/Other",
  "budget": "الميزانية",
  "successRate": 0-100,
  "warning": "تحذير أو null",
  "proposal": "proposal احترافي 4-5 جمل بالإنجليزية يبرز الخبرة"
}`
              },
              { 
                role: 'user', 
                content: `العنوان: ${result.title}\nالرابط: ${result.url}\nالوصف: ${result.content?.substring(0, 500)}` 
              }
            ],
            max_tokens: 600,
            temperature: 0.3
          })
        });

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || '';
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          if (analysis.isRelevant) {
            opportunities.push({
              id: `opp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              title: analysis.title || result.title,
              platform: analysis.platform || 'Unknown',
              budget: analysis.budget || 'غير محدد',
              successRate: analysis.successRate || 50,
              status: 'new',
              deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              link: result.url,
              proposal: analysis.proposal || '',
              warning: analysis.warning,
              foundDate: new Date().toISOString().split('T')[0]
            });
          }
        }
      } catch (e) {
        console.error('Analysis error:', e);
      }
    }

    console.log(`Analyzed ${opportunities.length} relevant opportunities`);

    // 3. Update GitHub data.json
    if (GITHUB_TOKEN && opportunities.length > 0) {
      try {
        // Get current SHA
        const shaResponse = await fetch(
          'https://api.github.com/repos/baselomar044-dev/qs-empire/contents/data.json',
          { headers: { 'Authorization': `token ${GITHUB_TOKEN}` } }
        );
        const shaData = await shaResponse.json();
        const currentSha = shaData.sha;

        // Update data
        const newData = {
          opportunities,
          lastUpdated: new Date().toISOString(),
          autoUpdateEnabled: true,
          searchCount: uniqueResults.length,
          relevantCount: opportunities.length
        };

        const updateResponse = await fetch(
          'https://api.github.com/repos/baselomar044-dev/qs-empire/contents/data.json',
          {
            method: 'PUT',
            headers: {
              'Authorization': `token ${GITHUB_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: `🤖 Auto-update: ${opportunities.length} opportunities found`,
              content: Buffer.from(JSON.stringify(newData, null, 2)).toString('base64'),
              sha: currentSha
            })
          }
        );

        const updateData = await updateResponse.json();
        console.log('GitHub updated:', updateData.commit?.message);
      } catch (e) {
        console.error('GitHub update error:', e);
      }
    }

    // 4. Send email report
    const today = new Date().toLocaleDateString('ar-EG', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const emailHtml = `
<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; padding: 20px; direction: rtl; }
    .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .stats { display: flex; justify-content: center; gap: 30px; padding: 20px; background: #f8f9ff; }
    .stat { text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; color: #667eea; }
    .stat-label { font-size: 12px; color: #666; }
    .content { padding: 30px; }
    .opportunity { background: #f8f9ff; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-right: 4px solid #667eea; }
    .opp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .opp-title { font-size: 18px; font-weight: bold; color: #333; margin: 0; }
    .opp-platform { background: #667eea; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
    .opp-details { display: flex; gap: 20px; margin: 15px 0; font-size: 14px; color: #666; }
    .success-rate { display: inline-block; padding: 4px 10px; border-radius: 10px; font-weight: bold; }
    .high { background: #d4edda; color: #155724; }
    .medium { background: #fff3cd; color: #856404; }
    .low { background: #f8d7da; color: #721c24; }
    .proposal { background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin: 15px 0; font-size: 14px; line-height: 1.6; }
    .proposal-label { font-size: 12px; color: #667eea; font-weight: bold; margin-bottom: 8px; }
    .apply-btn { display: inline-block; background: #667eea; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 8px; margin: 10px 0; font-size: 13px; }
    .footer { background: #f8f9ff; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    .cta { text-align: center; padding: 20px; }
    .cta a { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; border-radius: 30px; text-decoration: none; font-weight: bold; font-size: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏗️ QS Empire</h1>
      <p>${today}</p>
    </div>
    
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${opportunities.length}</div>
        <div class="stat-label">فرص جديدة</div>
      </div>
      <div class="stat">
        <div class="stat-value">${opportunities.filter(o => o.successRate >= 70).length}</div>
        <div class="stat-label">نسبة نجاح عالية</div>
      </div>
    </div>
    
    <div class="content">
      <h2>🎯 الفرص الجديدة</h2>
      
      ${opportunities.length === 0 ? '<p>لم يتم العثور على فرص جديدة اليوم. سنبحث مرة أخرى غداً!</p>' : ''}
      
      ${opportunities.map((opp, i) => `
        <div class="opportunity">
          <div class="opp-header">
            <h3 class="opp-title">${i + 1}. ${opp.title}</h3>
            <span class="opp-platform">${opp.platform}</span>
          </div>
          
          <div class="opp-details">
            <span>💰 ${opp.budget}</span>
            <span class="success-rate ${opp.successRate >= 70 ? 'high' : opp.successRate >= 50 ? 'medium' : 'low'}">
              ${opp.successRate}% نسبة النجاح
            </span>
          </div>
          
          ${opp.warning ? `<div class="warning">⚠️ ${opp.warning}</div>` : ''}
          
          <div class="proposal">
            <div class="proposal-label">📝 PROPOSAL جاهز للنسخ:</div>
            ${opp.proposal}
          </div>
          
          <a href="${opp.link}" class="apply-btn" target="_blank">🔗 قدّم الآن</a>
        </div>
      `).join('')}
    </div>
    
    <div class="cta">
      <a href="https://qs-empire.vercel.app">🌐 افتح لوحة التحكم</a>
    </div>
    
    <div class="footer">
      <p>🤖 تم إنشاء هذا التقرير تلقائياً بواسطة QS Empire AI</p>
      <p>هذا النظام ملكك 100% - يعمل بشكل مستقل</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'QS Empire <onboarding@resend.dev>',
        to: [OWNER_EMAIL],
        subject: `🏗️ QS Empire | ${opportunities.length} فرص جديدة - ${today}`,
        html: emailHtml
      })
    });

    const emailData = await emailResponse.json();
    console.log('Email sent:', emailData.id);

    return res.status(200).json({
      success: true,
      message: 'Daily job completed successfully',
      stats: {
        searched: uniqueResults.length,
        relevant: opportunities.length,
        emailSent: !!emailData.id,
        githubUpdated: true
      }
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return res.status(500).json({ 
      error: 'Cron job failed',
      details: error.message 
    });
  }
}

export const config = {
  maxDuration: 60
};
