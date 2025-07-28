import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { holdingsAPI, formatCurrency, formatPercentage, getChangeColor } from '../services/api';

const Holdings = () => {
  const { data: holdings, isLoading } = useQuery('holdings', holdingsAPI.getHoldings);

  if (isLoading) {
    return <LinearProgress />;
  }

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Holdings Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ borderRadius: 2 }}
        >
          Add Holding
        </Button>
      </Box>

      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Avg Price</TableCell>
                  <TableCell align="right">Current Price</TableCell>
                  <TableCell align="right">Market Value</TableCell>
                  <TableCell align="right">Gain/Loss</TableCell>
                  <TableCell align="right">Day Change</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {holdings?.data?.map((holding) => (
                  <TableRow key={holding.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{holding.symbol}</TableCell>
                    <TableCell>{holding.name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={holding.type} 
                        size="small"
                        color={holding.type === 'stock' ? 'primary' : 'secondary'}
                      />
                    </TableCell>
                    <TableCell align="right">{holding.quantity}</TableCell>
                    <TableCell align="right">{formatCurrency(holding.avgPrice)}</TableCell>
                    <TableCell align="right">{formatCurrency(holding.currentPrice)}</TableCell>
                    <TableCell align="right">{formatCurrency(holding.currentValue)}</TableCell>
                    <TableCell 
                      align="right"
                      sx={{ 
                        color: getChangeColor(holding.gainLoss),
                        fontWeight: 600
                      }}
                    >
                      {formatCurrency(holding.gainLoss)}
                      <br />
                      <Typography variant="caption">
                        ({formatPercentage(holding.gainLossPercent)})
                      </Typography>
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{ 
                        color: getChangeColor(holding.dayChange),
                        fontWeight: 500
                      }}
                    >
                      {formatCurrency(holding.dayChange)}
                      <br />
                      <Typography variant="caption">
                        ({formatPercentage(holding.dayChangePercent)})
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" sx={{ mr: 1 }}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Holdings; 