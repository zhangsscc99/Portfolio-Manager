import React from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom'; // 确保导入 Outlet

function Markets() {
  const navigate = useNavigate();
  const location = useLocation();

  // 这里的逻辑是为了让 Tabs 组件能够正确反映当前 URL
  // 例如，如果 URL 是 /app/markets/stock，那么 currentTab 应该是 'stock'
  // split('/').pop() 会获取路径的最后一个部分
  // || 'stock' 作为备用，当路径只有 /app/markets 时，默认选中 'stock'
  const currentTab = location.pathname.split('/').pop() || 'stock'; 

  const handleChange = (event, newValue) => {
    // 导航到新的子路由
    navigate(`/app/markets/${newValue}`);
  };

  return (
      <Outlet /> 
  );
}

export default Markets;