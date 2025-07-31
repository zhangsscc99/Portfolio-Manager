// scripts/insertPortfolioHistory.js
const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'n3u3da!',
    database: 'portfolio_manager',
  });

  const portfolioId = 1;
  const days = 730;
  let baseValue = 100000;

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days + 1);

  const insertSQL = `
    INSERT INTO portfolio_history (portfolio_id, date, total_value)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE total_value = VALUES(total_value)
  `;

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    // 模拟每日小幅增长或波动
    const dailyChange = (Math.random() * 0.002 - 0.001); // ±0.1%
    baseValue *= (1 + dailyChange);
    const totalValue = parseFloat(baseValue.toFixed(2));

    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD

    await connection.execute(insertSQL, [portfolioId, formattedDate, totalValue]);
  }

  console.log(`✅ 插入了 ${days} 条 portfolio_history 数据`);

  await connection.end();
})();
