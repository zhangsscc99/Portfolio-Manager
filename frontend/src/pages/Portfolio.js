import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';
import { useQuery } from 'react-query';
import { portfolioAPI, formatCurrency, formatPercentage } from '../services/api';

const Portfolio = () => {
  const { data: portfolio, isLoading } = useQuery(
    'currentPortfolio',
    portfolioAPI.getCurrentPortfolio
  );

  if (isLoading) {
    return <LinearProgress />;
  }

  const portfolioData = portfolio?.data;

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Portfolio Overview
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ borderRadius: 2 }}
          >
            Add Investment
          </Button>

          <Button
            variant="contained"
            startIcon={<RemoveIcon />}
            sx={{ borderRadius: 2 }}
          >
            Remove Investment
          </Button>
        
        </Box>



      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Value
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {formatCurrency(portfolioData?.totalValue || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cash Available
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'success.main' }}>
                {formatCurrency(portfolioData?.cash || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Holdings
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {portfolioData?.holdings?.length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Holdings Details
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Symbol</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Avg Price</TableCell>
                      <TableCell align="right">Current Price</TableCell>
                      <TableCell align="right">Total Value</TableCell>
                      <TableCell align="right">Gain/Loss</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {portfolioData?.holdings?.map((holding) => (
                      <TableRow key={holding.id}>
                        <TableCell sx={{ fontWeight: 600 }}>{holding.symbol}</TableCell>
                        <TableCell>{holding.name}</TableCell>
                        <TableCell align="right">{holding.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(holding.avgPrice)}</TableCell>
                        <TableCell align="right">{formatCurrency(holding.currentPrice)}</TableCell>
                        <TableCell align="right">{formatCurrency(holding.currentValue)}</TableCell>
                        <TableCell 
                          align="right"
                          sx={{ 
                            color: holding.gainLoss >= 0 ? 'success.main' : 'error.main',
                            fontWeight: 600
                          }}
                        >
                          {formatCurrency(holding.gainLoss)} ({formatPercentage(holding.gainLossPercent)})
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Portfolio; 