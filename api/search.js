// QS Empire Search - Powered by Tavily
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  
  // Search queries for QS opportunities
  const searchQueries = [
    'Quantity Surveyor freelance job Upwork',
    'BOQ cost estimation freelancer',
    'quantity takeoff remote work UAE',
    'حصر كميات مستقل mostaql',
    'Fiverr quantity surveyor gig'
  ];

  try {
    const allResults = [];
    
    // Search each query
    for (const query of searchQueries) {
      const searchResponse = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query: query,
          search_depth: 'basic',
          max_results: 5,
          include_domains: ['upwork.com', 'freelancer.com', 'mostaql.com', 'fiverr.com', 'linkedin.com'],
          exclude_domains: []
        })
      });
      
      const searchData = await searchResponse.json();
      if (searchData.results) {
        allResults.push(...searchData.results);
      }
    }

    // Remove duplicates by URL
    const uniqueResults = allResults.filter((item, index, self) =>
      index === self.findIndex(t => t.url === item.url)
    );

    // Analyze with AI
    const opportunities = [];
    
    for (const result of uniqueResults.slice(0, 10)) {
      const analysisPrompt = `حلل هذه الفرصة لـ Quantity Surveyor:
العنوان: ${result.title}
الرابط: ${result.url}
الوصف: ${result.content}

أعطني JSON فقط بهذا الشكل:
{
  "isRelevant": true/false,
  "title": "عنوان مختصر",
  "platform": "Upwork/Freelancer/Mostaql/Fiverr/LinkedIn",
  "budget": "الميزانية التقديرية",
  "successRate": 0-100,
  "warning": "أي تحذيرات أو null",
  "proposal": "اكتب proposal احترافي من 3-4 جمل"
}`;

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
              { role: 'system', content: 'أنت محلل فرص عمل. رد بـ JSON فقط بدون أي نص إضافي.' },
              { role: 'user', content: analysisPrompt }
            ],
            max_tokens: 500,
            temperature: 0.3
          })
        });

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || '';
        
        // Parse JSON from response
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

    return res.status(200).json({
      success: true,
      count: opportunities.length,
      opportunities,
      searchedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ 
      error: 'حدث خطأ في البحث',
      details: error.message 
    });
  }
}
