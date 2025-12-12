import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Collapse, IconButton } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  memoryUsage?: number;
  componentMountTime: number;
}

interface PerformanceMonitorProps {
  componentName: string;
  enabled?: boolean;
  showDetails?: boolean;
}

/**
 * Performance monitoring component for development
 * Tracks render performance and memory usage
 */
const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  componentName,
  enabled = process.env.NODE_ENV === 'development',
  showDetails = false
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    componentMountTime: Date.now()
  });
  const [expanded, setExpanded] = useState(false);
  const renderTimes = useRef<number[]>([]);
  const lastRenderStart = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    // Mark render start
    lastRenderStart.current = performance.now();

    return () => {
      // Mark render end and calculate metrics
      const renderTime = performance.now() - lastRenderStart.current;
      renderTimes.current.push(renderTime);

      // Keep only last 10 render times for average calculation
      if (renderTimes.current.length > 10) {
        renderTimes.current = renderTimes.current.slice(-10);
      }

      const averageRenderTime = renderTimes.current.reduce((sum, time) => sum + time, 0) / renderTimes.current.length;

      setMetrics(prev => ({
        ...prev,
        renderCount: prev.renderCount + 1,
        lastRenderTime: renderTime,
        averageRenderTime,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || undefined
      }));
    };
  });

  // Performance warning thresholds
  const isSlowRender = metrics.lastRenderTime > 16; // 60fps threshold
  const isManyRenders = metrics.renderCount > 50;
  const hasPerformanceIssue = isSlowRender || isManyRenders;

  if (!enabled || (!showDetails && !hasPerformanceIssue)) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 10,
        right: 10,
        backgroundColor: hasPerformanceIssue ? 'warning.light' : 'info.light',
        border: '1px solid',
        borderColor: hasPerformanceIssue ? 'warning.main' : 'info.main',
        borderRadius: 1,
        p: 1,
        fontSize: '0.75rem',
        fontFamily: 'monospace',
        zIndex: 9999,
        maxWidth: 300,
        opacity: 0.9
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
          🔍 {componentName}
        </Typography>
        <IconButton
          size="small"
          onClick={() => setExpanded(!expanded)}
          sx={{ p: 0.5 }}
        >
          {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" display="block">
            Renders: {metrics.renderCount}
            {isManyRenders && ' ⚠️'}
          </Typography>
          <Typography variant="caption" display="block">
            Last: {metrics.lastRenderTime.toFixed(2)}ms
            {isSlowRender && ' 🐌'}
          </Typography>
          <Typography variant="caption" display="block">
            Avg: {metrics.averageRenderTime.toFixed(2)}ms
          </Typography>
          {metrics.memoryUsage && (
            <Typography variant="caption" display="block">
              Memory: {(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB
            </Typography>
          )}
          <Typography variant="caption" display="block">
            Uptime: {((Date.now() - metrics.componentMountTime) / 1000).toFixed(1)}s
          </Typography>
        </Box>
      </Collapse>

      {hasPerformanceIssue && !expanded && (
        <Typography variant="caption" display="block" sx={{ color: 'warning.dark' }}>
          Performance issue detected
        </Typography>
      )}
    </Box>
  );
};

/**
 * Hook for tracking component performance
 */
export const usePerformanceTracking = (componentName: string) => {
  const renderCount = useRef(0);
  const mountTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
  });

  const logPerformanceMetrics = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Performance metrics for ${componentName}:`, {
        renderCount: renderCount.current,
        uptime: Date.now() - mountTime.current,
        averageRenderInterval: (Date.now() - mountTime.current) / renderCount.current
      });
    }
  };

  return {
    renderCount: renderCount.current,
    uptime: Date.now() - mountTime.current,
    logPerformanceMetrics
  };
};

export default PerformanceMonitor;