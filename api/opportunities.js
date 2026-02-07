// Fetch opportunities from database
import Database from 'better-sqlite3';
import path from 'path';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const dbPath = path.join(process.cwd(), 'agent_memory.db');
    const db = new Database(dbPath);
    
    const opportunities = db.prepare(`
      SELECT id, title, platform, url, budget, description, 
             success_rate as successRate, suggested_price, proposal, 
             status, found_at as foundDate, result
      FROM qs_opportunities
      ORDER BY found_at DESC
    `).all();

    // Format for frontend
    const formatted = opportunities.map(opp => ({
      id: opp.id,
      title: opp.title,
      platform: opp.platform,
      budget: opp.budget || 'غير محدد',
      successRate: opp.successRate || 50,
      status: opp.status,
      url: opp.url,
      proposal: opp.proposal || '',
      posted: new Date(opp.foundDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }));

    db.close();

    res.status(200).json({
      success: true,
      count: formatted.length,
      opportunities: formatted,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch opportunities',
      details: error.message 
    });
  }
}
