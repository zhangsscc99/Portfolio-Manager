const { Asset, Portfolio, Watchlist } = require('../models/index');

// 🎯 Add comprehensive sample asset data
const addSampleAssets = async () => {
  try {
    console.log('🔄 Adding comprehensive sample assets...');

    // Ensure portfolio exists
    let portfolio = await Portfolio.findByPk(1);
    if (!portfolio) {
      portfolio = await Portfolio.create({
        name: 'My Investment Portfolio',
        description: 'Diversified portfolio with various asset types',
        cash: 15000.00,
        total_value: 0.00
      });
      console.log('✅ Created sample portfolio');
    }

    // Comprehensive sample assets data - 3 assets per type
    const sampleAssets = [
      // 📈 STOCKS (3 assets)
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        asset_type: 'stock',
        quantity: 50,
        avg_cost: 150.00,
        current_price: 175.25,
        currency: 'USD',
        exchange: 'NASDAQ',
        price_source: 'yahoo_finance',
        source_symbol: 'AAPL',
        portfolio_id: portfolio.id,
        category: 'Technology'
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        asset_type: 'stock',
        quantity: 30,
        avg_cost: 300.00,
        current_price: 315.75,
        currency: 'USD',
        exchange: 'NASDAQ',
        price_source: 'yahoo_finance',
        source_symbol: 'MSFT',
        portfolio_id: portfolio.id,
        category: 'Technology'
      },
      {
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        asset_type: 'stock',
        quantity: 15,
        avg_cost: 800.00,
        current_price: 245.60,
        currency: 'USD',
        exchange: 'NASDAQ',
        price_source: 'yahoo_finance',
        source_symbol: 'TSLA',
        portfolio_id: portfolio.id,
        category: 'Automotive'
      },

      // ₿ CRYPTOCURRENCY (3 assets)
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        asset_type: 'crypto',
        quantity: 0.5,
        avg_cost: 45000.00,
        current_price: 42000.00,
        currency: 'USD',
        exchange: 'Binance',
        price_source: 'coingecko',
        source_symbol: 'btc',
        portfolio_id: portfolio.id,
        category: 'Cryptocurrency'
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        asset_type: 'crypto',
        quantity: 5,
        avg_cost: 3000.00,
        current_price: 3200.00,
        currency: 'USD',
        exchange: 'Coinbase',
        price_source: 'coingecko',
        source_symbol: 'eth',
        portfolio_id: portfolio.id,
        category: 'Cryptocurrency'
      },
      {
        symbol: 'ADA',
        name: 'Cardano',
        asset_type: 'crypto',
        quantity: 1000,
        avg_cost: 0.45,
        current_price: 0.52,
        currency: 'USD',
        exchange: 'Kraken',
        price_source: 'coingecko',
        source_symbol: 'ada',
        portfolio_id: portfolio.id,
        category: 'Cryptocurrency'
      },

      // 🏛️ ETF FUNDS (3 assets)
      {
        symbol: 'SPY',
        name: 'SPDR S&P 500 ETF Trust',
        asset_type: 'etf',
        quantity: 100,
        avg_cost: 400.00,
        current_price: 425.75,
        currency: 'USD',
        exchange: 'NYSE',
        price_source: 'yahoo_finance',
        source_symbol: 'SPY',
        portfolio_id: portfolio.id,
        category: 'Large Cap'
      },
      {
        symbol: 'QQQ',
        name: 'Invesco QQQ Trust',
        asset_type: 'etf',
        quantity: 50,
        avg_cost: 350.00,
        current_price: 365.20,
        currency: 'USD',
        exchange: 'NASDAQ',
        price_source: 'yahoo_finance',
        source_symbol: 'QQQ',
        portfolio_id: portfolio.id,
        category: 'Technology'
      },
      {
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        asset_type: 'etf',
        quantity: 75,
        avg_cost: 220.00,
        current_price: 235.80,
        currency: 'USD',
        exchange: 'NYSE',
        price_source: 'yahoo_finance',
        source_symbol: 'VTI',
        portfolio_id: portfolio.id,
        category: 'Total Market'
      },



      // 📜 BONDS (3 assets)
      {
        symbol: 'TLT',
        name: 'iShares 20+ Year Treasury Bond ETF',
        asset_type: 'bond',
        quantity: 25,
        avg_cost: 142.50,
        current_price: 138.20,
        currency: 'USD',
        exchange: 'NASDAQ',
        price_source: 'manual',
        source_symbol: 'TLT',
        portfolio_id: portfolio.id,
        category: 'Government'
      },
      {
        symbol: 'LQD',
        name: 'iShares iBoxx Investment Grade Corporate Bond ETF',
        asset_type: 'bond',
        quantity: 40,
        avg_cost: 125.30,
        current_price: 127.85,
        currency: 'USD',
        exchange: 'NYSE',
        price_source: 'manual',
        source_symbol: 'LQD',
        portfolio_id: portfolio.id,
        category: 'Corporate'
      },
      {
        symbol: 'HYG',
        name: 'iShares iBoxx High Yield Corporate Bond ETF',
        asset_type: 'bond',
        quantity: 60,
        avg_cost: 82.75,
        current_price: 84.10,
        currency: 'USD',
        exchange: 'NYSE',
        price_source: 'manual',
        source_symbol: 'HYG',
        portfolio_id: portfolio.id,
        category: 'High Yield'
      },

      // 💰 CASH (3 different currencies)
      {
        symbol: 'USD-CASH',
        name: 'US Dollar Cash',
        asset_type: 'cash',
        quantity: 5000,
        avg_cost: 1.00,
        current_price: 1.00,
        currency: 'USD',
        price_source: 'manual',
        source_symbol: 'USD',
        portfolio_id: portfolio.id,
        category: 'Cash'
      },
      {
        symbol: 'EUR-CASH',
        name: 'Euro Cash',
        asset_type: 'cash',
        quantity: 2000,
        avg_cost: 1.08,
        current_price: 1.11,
        currency: 'USD',
        price_source: 'manual',
        source_symbol: 'EUR',
        portfolio_id: portfolio.id,
        category: 'Cash'
      },
      {
        symbol: 'GBP-CASH',
        name: 'British Pound Cash',
        asset_type: 'cash',
        quantity: 1500,
        avg_cost: 1.25,
        current_price: 1.28,
        currency: 'USD',
        price_source: 'manual',
        source_symbol: 'GBP',
        portfolio_id: portfolio.id,
        category: 'Cash'
      },

      // 🥇 COMMODITIES (3 assets)
      {
        symbol: 'GLD',
        name: 'SPDR Gold Trust',
        asset_type: 'commodity',
        quantity: 20,
        avg_cost: 180.00,
        current_price: 185.50,
        currency: 'USD',
        exchange: 'NYSE',
        price_source: 'manual',
        source_symbol: 'GLD',
        portfolio_id: portfolio.id,
        category: 'Precious Metals'
      },
      {
        symbol: 'SLV',
        name: 'iShares Silver Trust',
        asset_type: 'commodity',
        quantity: 100,
        avg_cost: 22.30,
        current_price: 24.75,
        currency: 'USD',
        exchange: 'NYSE',
        price_source: 'manual',
        source_symbol: 'SLV',
        portfolio_id: portfolio.id,
        category: 'Precious Metals'
      },
      {
        symbol: 'USO',
        name: 'United States Oil Fund',
        asset_type: 'commodity',
        quantity: 50,
        avg_cost: 75.20,
        current_price: 78.40,
        currency: 'USD',
        exchange: 'NYSE',
        price_source: 'manual',
        source_symbol: 'USO',
        portfolio_id: portfolio.id,
        category: 'Energy'
      }
    ];

    // Clear existing sample data
    await Asset.destroy({
      where: { portfolio_id: portfolio.id }
    });

    // Bulk create assets
    const createdAssets = await Asset.bulkCreate(sampleAssets);
    
    // Calculate total value
    const totalValue = createdAssets.reduce((sum, asset) => {
      return sum + (parseFloat(asset.current_price) * parseFloat(asset.quantity));
    }, 0) + parseFloat(portfolio.cash);

    await portfolio.update({ total_value: totalValue });

    console.log(`✅ Successfully added ${createdAssets.length} sample assets`);
    console.log(`📊 Portfolio total value: $${totalValue.toLocaleString()}`);
    
    // Display statistics by asset type
    const assetTypes = {};
    createdAssets.forEach(asset => {
      if (!assetTypes[asset.asset_type]) {
        assetTypes[asset.asset_type] = { count: 0, value: 0 };
      }
      assetTypes[asset.asset_type].count++;
      assetTypes[asset.asset_type].value += parseFloat(asset.current_price) * parseFloat(asset.quantity);
    });

    console.log('\n📋 Asset Type Statistics:');
    Object.entries(assetTypes).forEach(([type, data]) => {
      console.log(`   ${type}: ${data.count} items, $${data.value.toLocaleString()}`);
    });

    // Add some sample watchlist items
    console.log('\n🔄 Adding sample watchlist items...');
    
    await Watchlist.destroy({ where: {} }); // Clear existing watchlist
    
    const watchlistItems = [
      {
        symbol: 'AMZN',
        name: 'Amazon.com Inc.',
        asset_type: 'stock',
        current_price: 3150.80,
        price_change: 45.20,
        price_change_percent: 1.45,
        price_source: 'yahoo_finance',
        source_symbol: 'AMZN'
      },
      {
        symbol: 'NVDA',
        name: 'NVIDIA Corporation',
        asset_type: 'stock',
        current_price: 875.30,
        price_change: -12.50,
        price_change_percent: -1.41,
        price_source: 'yahoo_finance',
        source_symbol: 'NVDA'
      },
      {
        symbol: 'SOL',
        name: 'Solana',
        asset_type: 'crypto',
        current_price: 95.20,
        price_change: 2.80,
        price_change_percent: 3.03,
        price_source: 'coingecko',
        source_symbol: 'sol'
      }
    ];

    await Watchlist.bulkCreate(watchlistItems);
    console.log(`✅ Added ${watchlistItems.length} watchlist items`);

    console.log('\n🎉 Sample data setup complete!');
    console.log('📈 Your portfolio now contains:');
    console.log('   - 3 Stocks (AAPL, MSFT, TSLA)');
    console.log('   - 3 Cryptocurrencies (BTC, ETH, ADA)');
    console.log('   - 3 ETF Funds (SPY, QQQ, VTI)');
    console.log('   - 3 Bonds (TLT, LQD, HYG)');
    console.log('   - 3 Cash Holdings (USD, EUR, GBP)');
    console.log('   - 3 Commodities (GLD, SLV, USO)');
    console.log('   - Watchlist with 3 items');
    
  } catch (error) {
    console.error('❌ Failed to add sample assets:', error);
  } finally {
    process.exit(0);
  }
};

// If this script is run directly
if (require.main === module) {
  addSampleAssets();
}

module.exports = { addSampleAssets }; 