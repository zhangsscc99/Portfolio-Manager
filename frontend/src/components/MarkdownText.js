import React from 'react';
import { Typography, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const MarkdownText = ({ children, variant = 'body1', sx = {}, ...props }) => {
  // Define processInlineMarkdown first since it's used by other functions
  const processInlineMarkdown = (text) => {
    const parts = [];
    let currentIndex = 0;

    // Process **bold** text
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > currentIndex) {
        const beforeText = text.slice(currentIndex, match.index);
        parts.push(processItalicAndOther(beforeText, parts.length));
      }

      // Add bold text
      parts.push(
        <Typography 
          key={`bold-${parts.length}`}
          component="span" 
          sx={{ fontWeight: 'bold', color: '#E8A855' }}
        >
          {match[1]}
        </Typography>
      );

      currentIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      const remainingText = text.slice(currentIndex);
      parts.push(processItalicAndOther(remainingText, parts.length));
    }

    return parts.length > 0 ? parts : text;
  };

  const processItalicAndOther = (text, keyBase) => {
    const parts = [];
    let currentIndex = 0;

    // Process *italic* text
    const italicRegex = /\*(.*?)\*/g;
    let match;

    while ((match = italicRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > currentIndex) {
        parts.push(text.slice(currentIndex, match.index));
      }

      // Add italic text
      parts.push(
        <Typography 
          key={`italic-${keyBase}-${parts.length}`}
          component="span" 
          sx={{ fontStyle: 'italic' }}
        >
          {match[1]}
        </Typography>
      );

      currentIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.slice(currentIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const renderMarkdownText = (text) => {
    if (!text || typeof text !== 'string') {
      return text;
    }

    // Split text into lines to handle each line separately
    const lines = text.split('\n');
    const elements = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (!line.trim()) {
        elements.push(<br key={i} />);
        i++;
        continue;
      }

      // Check for markdown table
      if (line.trim().includes('|') && i + 1 < lines.length && lines[i + 1].includes('|')) {
        const tableResult = parseTable(lines, i);
        if (tableResult.table) {
          elements.push(tableResult.table);
          i = tableResult.nextIndex;
          continue;
        }
      }

      // Check if line starts with bullet point
      if (line.trim().startsWith('- ')) {
        const bulletContent = line.trim().substring(2);
        const processedBulletContent = processInlineMarkdown(bulletContent);
        elements.push(
          <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}>
            <Typography component="span" sx={{ mr: 1, fontWeight: 'bold' }}>•</Typography>
            <Typography component="span" variant={variant} sx={{ flex: 1, ...sx }}>
              {processedBulletContent}
            </Typography>
          </Box>
        );
        i++;
        continue;
      }

      // Regular line
      const processedLine = processInlineMarkdown(line);
      elements.push(
        <Typography key={i} component="div" variant={variant} sx={{ mb: 0.5, ...sx }}>
          {processedLine}
        </Typography>
      );
      i++;
    }

    return elements;
  };

  const parseTable = (lines, startIndex) => {
    const tableLines = [];
    let currentIndex = startIndex;

    // Collect all table lines
    while (currentIndex < lines.length && lines[currentIndex].trim().includes('|')) {
      const line = lines[currentIndex].trim();
      if (line) {
        tableLines.push(line);
      }
      currentIndex++;
    }

    if (tableLines.length < 2) {
      return { table: null, nextIndex: startIndex + 1 };
    }

    // Parse header
    const headerLine = tableLines[0];
    const headers = headerLine.split('|').map(cell => cell.trim()).filter(cell => cell);

    // Skip separator line (usually contains dashes)
    let dataStartIndex = 1;
    if (tableLines[1] && tableLines[1].includes('-')) {
      dataStartIndex = 2;
    }

    // Parse data rows
    const rows = [];
    for (let i = dataStartIndex; i < tableLines.length; i++) {
      const rowLine = tableLines[i];
      const cells = rowLine.split('|').map(cell => cell.trim()).filter(cell => cell);
      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    // Create table component
    const tableKey = `table-${startIndex}`;
    const table = (
      <TableContainer 
        key={tableKey} 
        component={Paper} 
        variant="outlined"
        sx={{ 
          mb: 2, 
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          '& .MuiTableCell-root': {
            borderColor: 'rgba(255, 255, 255, 0.1)',
            color: 'inherit'
          }
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              {headers.map((header, index) => (
                <TableCell 
                  key={index} 
                  sx={{ 
                    fontWeight: 'bold',
                    backgroundColor: 'rgba(232, 168, 85, 0.1)',
                    color: '#E8A855'
                  }}
                >
                  {processInlineMarkdown(header)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>
                    {processInlineMarkdown(cell)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );

    return { table, nextIndex: currentIndex };
  };

  return (
    <Box sx={{ lineHeight: 1.6, ...sx }} {...props}>
      {renderMarkdownText(children)}
    </Box>
  );
};

export default MarkdownText; 