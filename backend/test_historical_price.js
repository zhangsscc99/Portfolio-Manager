const yahooFinance = require('yahoo-finance2').default;

async function testHistoricalPrice() {
  try {
    console.log('Testing historical price for AAPL on 2024-01-16...');
    
    const historicalResult = await yahooFinance.chart('AAPL', {
      period1: new Date('2024-01-16'),
      period2: new Date('2024-01-17'), // 加一天
      interval: '1d'
    });

    console.log('Historical data keys:', Object.keys(historicalResult));
    console.log('Quotes:', historicalResult.quotes);
    
    if (historicalResult.quotes && historicalResult.quotes.length > 0) {
      const quote = historicalResult.quotes[0];
      console.log('Quote data:', {
        timestamp: quote.timestamp,
        open: quote.open,
        high: quote.high,
        low: quote.low,
        close: quote.close,
        volume: quote.volume
      });
    } else {
      console.log('No historical data found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testHistoricalPrice(); 