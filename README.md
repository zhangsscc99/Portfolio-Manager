# Portfolio Manager

A modern, full-stack portfolio management application built with React and Node.js. Track your investments, view performance analytics, and stay updated with market data.

## 🚀 Features

- **Dashboard Overview**: Real-time portfolio value, performance charts, and market movers
- **Holdings Management**: Add, edit, and track individual stock positions  
- **Portfolio Analytics**: Performance metrics, sector allocation, and benchmarking
- **Market Data**: Live stock quotes, trending stocks, gainers/losers
- **Responsive Design**: Optimized for both desktop and mobile devices
- **Dark Theme**: Modern, professional dark interface

## 🏗️ Architecture

### Backend (Node.js/Express)
- RESTful API with Express.js
- In-memory data storage (easily replaceable with database)
- Mock market data with realistic fluctuations
- CORS enabled for frontend integration

### Frontend (React)
- Material-UI components with custom dark theme
- Chart.js for interactive data visualizations
- React Query for efficient data fetching
- Responsive design with mobile support

## 📁 Project Structure

```
Portfolio_Manager/
├── backend/
│   ├── models/
│   │   ├── Portfolio.js
│   │   └── Holding.js
│   ├── routes/
│   │   ├── portfolio.js
│   │   ├── holdings.js
│   │   └── marketData.js
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── README.md
```

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the backend server:
```bash
npm start
```
or for development with auto-restart:
```bash
npm run dev
```

The backend API will be running on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

The frontend will be running on `http://localhost:3000`

## 🔧 API Endpoints

### Portfolio Endpoints
- `GET /api/portfolio` - Get all portfolios
- `GET /api/portfolio/current` - Get current portfolio
- `POST /api/portfolio` - Create new portfolio
- `PUT /api/portfolio/:id` - Update portfolio
- `DELETE /api/portfolio/:id` - Delete portfolio

### Holdings Endpoints
- `GET /api/holdings` - Get all holdings
- `POST /api/holdings` - Add new holding
- `PUT /api/holdings/:id` - Update holding
- `DELETE /api/holdings/:id` - Remove holding
- `POST /api/holdings/:id/buy` - Buy more shares
- `POST /api/holdings/:id/sell` - Sell shares

### Market Data Endpoints
- `GET /api/market/quote/:symbol` - Get stock quote
- `GET /api/market/quotes?symbols=AAPL,GOOGL` - Get multiple quotes
- `GET /api/market/trending` - Get trending stocks
- `GET /api/market/gainers` - Get top gainers
- `GET /api/market/losers` - Get top losers
- `GET /api/market/indices` - Get market indices

## 🎨 Design Features

### Inspired by Finary & Seeking Alpha
- **Dark Theme**: Professional dark interface with subtle gradients
- **Modern Typography**: Inter font family for excellent readability
- **Data Visualization**: Interactive charts and graphs
- **Responsive Layout**: Seamless experience across devices
- **Clean Navigation**: Intuitive sidebar with clear sections

### Key UI Components
- **Dashboard Cards**: Portfolio metrics with trend indicators
- **Performance Charts**: Line charts for portfolio growth
- **Asset Allocation**: Doughnut charts for portfolio breakdown
- **Holdings Table**: Comprehensive stock position management
- **Market Movers**: Real-time gainers and losers display

## 📱 Mobile Responsiveness

The application is fully responsive with:
- Collapsible sidebar navigation on mobile
- Touch-friendly interactive elements
- Optimized layouts for small screens
- Swipe gestures and mobile-first design patterns

## 🔮 Future Enhancements

- **Database Integration**: Replace in-memory storage with PostgreSQL/MongoDB
- **Real Market Data**: Integrate with Yahoo Finance or Alpha Vantage APIs
- **User Authentication**: JWT-based user management system
- **Advanced Analytics**: More sophisticated portfolio metrics
- **News Integration**: Financial news feed for holdings
- **Alert System**: Price and performance notifications
- **Export Features**: PDF reports and CSV exports

## 🚦 Development Status

This is a training project demonstrating:
- ✅ Full-stack application architecture
- ✅ RESTful API design and implementation  
- ✅ Modern React development patterns
- ✅ Responsive UI/UX design
- ✅ Data visualization and charts
- ✅ State management with React Query

## 🤝 Contributing

This project was created as part of a portfolio management training exercise. Feel free to fork and enhance with additional features!

## 📄 License

MIT License - feel free to use this project for learning and development purposes.

---

**Built with ❤️ using React, Node.js, and Material-UI** 

# 1. 构建前端
cd frontend
npm run build:prod

# 2. 创建网站目录
sudo mkdir -p /var/www/portfolio-manager
sudo cp -r build/* /var/www/portfolio-manager/

# 3. 设置权限
sudo chown -R www-data:www-data /var/www/portfolio-manager
sudo chmod -R 755 /var/www/portfolio-manager

# 4. 配置Nginx
sudo nano /etc/nginx/sites-available/portfolio-manager

server {
    listen 3050;
    server_name 47.243.102.28;
    
    # 前端静态文件
    root /var/www/portfolio-manager;
    index index.html;
    
    # 处理React Router的客户端路由
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 后端API代理
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# 5. 启用配置
sudo ln -s /etc/nginx/sites-available/portfolio-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 6. 只启动后端
cd backend
pm2 start server.js --name "portfolio-backend"


#!/bin/bash
echo "🚀 部署 Portfolio Manager..."

# 拉取代码
git pull

# 后端部署
cd backend
npm install
pm2 restart portfolio-backend

# 前端构建和部署
cd ../frontend
npm install
npm run build:prod

# 复制到Nginx目录
sudo cp -r build/* /var/www/portfolio-manager/
sudo chown -R www-data:www-data /var/www/portfolio-manager

echo "✅ 部署完成!"
pm2 status


提示词
1前端
我要做一个homepage展现出来之前的欢迎页/展示页/启动页。就是介绍我们产品的 精美的一个页面 让人很有探索欲望的。这个页面简短地介绍过后，用户点击进入 再进入到主页。

2我想要替换掉紫色的主题色 改成金色 类似于finary那样

3想做一个finary的icon 那种特效