import React, { useEffect, useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Chip, Collapse, IconButton } from '@mui/material';
import { ExpandMore, ExpandLess, CheckCircle, Warning, Error } from '@mui/icons-material';

interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  element?: string;
  suggestion?: string;
}

interface AccessibilityTesterProps {
  enabled?: boolean;
  autoCheck?: boolean;
}

/**
 * Accessibility testing component for development
 * Performs basic accessibility checks on the current page
 */
const AccessibilityTester: React.FC<AccessibilityTesterProps> = ({
  enabled = process.env.NODE_ENV === 'development',
  autoCheck = true
}) => {
  const [issues, setIssues] = useState<AccessibilityIssue[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const performAccessibilityCheck = () => {
    if (!enabled) return;

    const foundIssues: AccessibilityIssue[] = [];

    // Check for missing alt text on images
    const images = document.querySelectorAll('img');
    images.forEach((img, index) => {
      if (!img.alt && !img.getAttribute('aria-label')) {
        foundIssues.push({
          type: 'error',
          message: `Image ${index + 1} missing alt text`,
          element: `img[src="${img.src}"]`,
          suggestion: 'Add alt attribute or aria-label for screen readers'
        });
      }
    });

    // Check for buttons without accessible names
    const buttons = document.querySelectorAll('button');
    buttons.forEach((button, index) => {
      const hasText = button.textContent?.trim();
      const hasAriaLabel = button.getAttribute('aria-label');
      const hasAriaLabelledBy = button.getAttribute('aria-labelledby');
      
      if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
        foundIssues.push({
          type: 'error',
          message: `Button ${index + 1} has no accessible name`,
          element: `button:nth-child(${index + 1})`,
          suggestion: 'Add text content, aria-label, or aria-labelledby'
        });
      }
    });

    // Check for form inputs without labels
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach((input, index) => {
      const hasLabel = document.querySelector(`label[for="${input.id}"]`);
      const hasAriaLabel = input.getAttribute('aria-label');
      const hasAriaLabelledBy = input.getAttribute('aria-labelledby');
      
      if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
        foundIssues.push({
          type: 'error',
          message: `Form input ${index + 1} has no associated label`,
          element: `${input.tagName.toLowerCase()}:nth-child(${index + 1})`,
          suggestion: 'Add a label element or aria-label attribute'
        });
      }
    });

    // Check for headings hierarchy
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let lastLevel = 0;
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      if (index === 0 && level !== 1) {
        foundIssues.push({
          type: 'warning',
          message: 'Page should start with h1',
          element: heading.tagName.toLowerCase(),
          suggestion: 'Use h1 for the main page heading'
        });
      }
      if (level > lastLevel + 1) {
        foundIssues.push({
          type: 'warning',
          message: `Heading level skipped from h${lastLevel} to h${level}`,
          element: heading.tagName.toLowerCase(),
          suggestion: 'Use sequential heading levels for proper hierarchy'
        });
      }
      lastLevel = level;
    });

    // Check for color contrast (basic check)
    const elementsWithText = document.querySelectorAll('*');
    elementsWithText.forEach((element) => {
      const computedStyle = window.getComputedStyle(element);
      const backgroundColor = computedStyle.backgroundColor;
      const color = computedStyle.color;
      
      // Simple check for very low contrast (this is a basic implementation)
      if (backgroundColor === 'rgb(255, 255, 255)' && color === 'rgb(255, 255, 255)') {
        foundIssues.push({
          type: 'error',
          message: 'White text on white background detected',
          element: element.tagName.toLowerCase(),
          suggestion: 'Ensure sufficient color contrast (4.5:1 for normal text)'
        });
      }
    });

    // Check for keyboard navigation
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) {
      foundIssues.push({
        type: 'warning',
        message: 'No focusable elements found',
        suggestion: 'Ensure interactive elements are keyboard accessible'
      });
    }

    // Check for ARIA landmarks
    const landmarks = document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer');
    if (landmarks.length === 0) {
      foundIssues.push({
        type: 'info',
        message: 'No ARIA landmarks found',
        suggestion: 'Add semantic HTML elements or ARIA landmarks for better navigation'
      });
    }

    // Check for live regions
    const liveRegions = document.querySelectorAll('[aria-live]');
    if (liveRegions.length === 0) {
      foundIssues.push({
        type: 'info',
        message: 'No ARIA live regions found',
        suggestion: 'Consider adding live regions for dynamic content updates'
      });
    }

    setIssues(foundIssues);
    setLastCheck(new Date());
  };

  useEffect(() => {
    if (autoCheck && enabled) {
      // Perform initial check after a delay to allow DOM to settle
      const timer = setTimeout(performAccessibilityCheck, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoCheck, enabled]);

  if (!enabled) {
    return null;
  }

  const errorCount = issues.filter(issue => issue.type === 'error').length;
  const warningCount = issues.filter(issue => issue.type === 'warning').length;
  const infoCount = issues.filter(issue => issue.type === 'info').length;

  const getIssueIcon = (type: AccessibilityIssue['type']) => {
    switch (type) {
      case 'error':
        return <Error color="error" fontSize="small" />;
      case 'warning':
        return <Warning color="warning" fontSize="small" />;
      case 'info':
        return <CheckCircle color="info" fontSize="small" />;
    }
  };

  const getIssueColor = (type: AccessibilityIssue['type']) => {
    switch (type) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 10,
        right: 10,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: errorCount > 0 ? 'error.main' : warningCount > 0 ? 'warning.main' : 'success.main',
        borderRadius: 1,
        p: 1,
        fontSize: '0.75rem',
        zIndex: 9999,
        maxWidth: 400,
        maxHeight: 300,
        overflow: 'auto',
        boxShadow: 3
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
          ♿ Accessibility Check
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {errorCount > 0 && <Chip label={`${errorCount} errors`} size="small" color="error" />}
          {warningCount > 0 && <Chip label={`${warningCount} warnings`} size="small" color="warning" />}
          {infoCount > 0 && <Chip label={`${infoCount} info`} size="small" color="info" />}
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{ p: 0.5 }}
          >
            {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
        </Box>
      </Box>

      {lastCheck && (
        <Typography variant="caption" display="block" sx={{ color: 'text.secondary', mb: 1 }}>
          Last check: {lastCheck.toLocaleTimeString()}
        </Typography>
      )}

      <Collapse in={expanded}>
        {issues.length === 0 ? (
          <Typography variant="caption" sx={{ color: 'success.main' }}>
            ✅ No accessibility issues found!
          </Typography>
        ) : (
          <List dense sx={{ p: 0 }}>
            {issues.map((issue, index) => (
              <ListItem key={index} sx={{ p: 0.5, alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, width: '100%' }}>
                  {getIssueIcon(issue.type)}
                  <Box sx={{ flex: 1 }}>
                    <ListItemText
                      primary={issue.message}
                      secondary={
                        <>
                          {issue.element && (
                            <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
                              Element: {issue.element}
                            </Typography>
                          )}
                          {issue.suggestion && (
                            <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                              💡 {issue.suggestion}
                            </Typography>
                          )}
                        </>
                      }
                      primaryTypographyProps={{ variant: 'caption' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </Box>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
        
        <Box sx={{ mt: 1, textAlign: 'center' }}>
          <IconButton
            size="small"
            onClick={performAccessibilityCheck}
            sx={{ fontSize: '0.75rem' }}
          >
            🔄 Recheck
          </IconButton>
        </Box>
      </Collapse>
    </Box>
  );
};

export default AccessibilityTester;