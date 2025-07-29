const db = require('../db');

class ChatDatabaseService {
  // Save or update chat session
  async saveSession(sessionId, portfolioId, portfolioContext, isPersistent = false) {
    try {
      const query = `
        INSERT INTO ai_chat_sessions (id, portfolio_id, portfolio_context, is_persistent, last_activity)
        VALUES (?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
        portfolio_context = VALUES(portfolio_context),
        last_activity = NOW()
      `;
      
      await db.execute(query, [
        sessionId,
        portfolioId,
        JSON.stringify(portfolioContext),
        isPersistent
      ]);
      
      console.log(`💾 Saved session ${sessionId} to database`);
      return { success: true };
    } catch (error) {
      console.error('Failed to save session:', error);
      return { success: false, error: error.message };
    }
  }

  // Save chat message
  async saveMessage(sessionId, role, content, isSystemUpdate = false) {
    try {
      const query = `
        INSERT INTO ai_chat_messages (session_id, role, content, is_system_update)
        VALUES (?, ?, ?, ?)
      `;
      
      await db.execute(query, [sessionId, role, content, isSystemUpdate]);
      console.log(`💬 Saved message to session ${sessionId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to save message:', error);
      return { success: false, error: error.message };
    }
  }

  // Load session with messages
  async loadSession(sessionId) {
    try {
      // Get session info
      const sessionQuery = `
        SELECT * FROM ai_chat_sessions WHERE id = ?
      `;
      const [sessionRows] = await db.execute(sessionQuery, [sessionId]);
      
      if (sessionRows.length === 0) {
        return { success: false, error: 'Session not found' };
      }
      
      const session = sessionRows[0];
      
      // Get messages
      const messagesQuery = `
        SELECT role, content, timestamp, is_system_update 
        FROM ai_chat_messages 
        WHERE session_id = ? 
        ORDER BY timestamp ASC
        LIMIT 50
      `;
      const [messageRows] = await db.execute(messagesQuery, [sessionId]);
      
      const messages = messageRows.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        isSystemUpdate: msg.is_system_update
      }));
      
      return {
        success: true,
        session: {
          id: session.id,
          portfolioId: session.portfolio_id,
          portfolioContext: session.portfolio_context ? JSON.parse(session.portfolio_context) : null,
          createdAt: session.created_at,
          lastActivity: session.last_activity,
          isPersistent: session.is_persistent,
          messages: messages
        }
      };
    } catch (error) {
      console.error('Failed to load session:', error);
      return { success: false, error: error.message };
    }
  }

  // Load all sessions for a portfolio
  async loadPortfolioSessions(portfolioId) {
    try {
      const query = `
        SELECT s.*, COUNT(m.id) as message_count
        FROM ai_chat_sessions s
        LEFT JOIN ai_chat_messages m ON s.id = m.session_id
        WHERE s.portfolio_id = ?
        GROUP BY s.id
        ORDER BY s.last_activity DESC
      `;
      
      const [rows] = await db.execute(query, [portfolioId]);
      
      return {
        success: true,
        sessions: rows.map(row => ({
          id: row.id,
          portfolioId: row.portfolio_id,
          createdAt: row.created_at,
          lastActivity: row.last_activity,
          isPersistent: row.is_persistent,
          messageCount: row.message_count
        }))
      };
    } catch (error) {
      console.error('Failed to load portfolio sessions:', error);
      return { success: false, error: error.message };
    }
  }

  // Clean up old sessions
  async cleanupOldSessions(maxAgeHours = 168) { // 7 days default
    try {
      const query = `
        DELETE FROM ai_chat_sessions 
        WHERE is_persistent = FALSE 
        AND last_activity < DATE_SUB(NOW(), INTERVAL ? HOUR)
      `;
      
      const [result] = await db.execute(query, [maxAgeHours]);
      console.log(`🧹 Cleaned up ${result.affectedRows} old sessions`);
      
      return { success: true, deletedCount: result.affectedRows };
    } catch (error) {
      console.error('Failed to cleanup old sessions:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ChatDatabaseService(); 