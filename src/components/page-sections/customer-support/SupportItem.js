import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useSpring, animated } from 'react-spring';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const AnimatedCard = animated(Card);

function CopyButton({ text, label }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Button
      variant="contained"
      size="small"
      onClick={handleCopy}
      sx={{
        textTransform: 'none',
        fontSize: '0.75rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        borderRadius: '6px',
        fontWeight: '500',
        boxShadow: 'none',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        color: '#fff',
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
        },
      }}
    >
      {label}
      <ContentCopyIcon style={{ fontSize: '1rem' }} />
    </Button>
  );
}

/**
 * Step 1: Extract tokens from the AI message:
 *  - {link: <URL>, linkText: <Label>}
 *  - {copyToClipboardLink: <Value>, linkText: <Label>}
 *
 * Step 2: On leftover text, parse highlight tags:
 *  - <HLA>...</HLA> (Amount)
 *  - <HLD>...</HLD> (Date)
 *  - <HLP>...</HLP> (Payment status)
 *  - <HLDS>...</HLDS> (Delivery status)
 */
function formatAiResponse(str) {
  // Regex for link tokens
  const tokenRegex =
    /{(link|copyToClipboardLink)\s*:\s*([^,]+)\s*,\s*linkText\s*:\s*([^}]+)}/g;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(str)) !== null) {
    const [fullMatch, tokenType, tokenValue, linkText] = match;
    const start = match.index;

    // Push any plain text before this token
    if (start > lastIndex) {
      const textChunk = str.slice(lastIndex, start);
      parts.push(...parseHighlightTags(textChunk));
    }

    // Handle the token
    if (tokenType === 'link') {
      parts.push(
        <a
          key={`link-${start}`}
          href={tokenValue.trim()}
          style={{
            color: '#64b5f6',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontWeight: 500,
            margin: '0 3px',
          }}
          target="_blank"
          rel="noopener noreferrer"
        >
          {linkText.trim()}
        </a>
      );
    } else if (tokenType === 'copyToClipboardLink') {
      parts.push(
        <CopyButton
          key={`copy-${start}`}
          text={tokenValue.trim()}
          label={linkText.trim()}
        />
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  // Any leftover text
  if (lastIndex < str.length) {
    const remainder = str.slice(lastIndex);
    parts.push(...parseHighlightTags(remainder));
  }

  return parts;
}

/**
 * Parse highlight tags:
 *  <HLA>...</HLA>, <HLD>...</HLD>, <HLP>...</HLP>, <HLDS>...</HLDS>.
 * We style them with dotted underlines & distinct colors (dark-theme friendly).
 */
function parseHighlightTags(text) {
  const tagRegex = /<(HLA|HLD|HLP|HLDS)>(.*?)<\/\1>/gi;

  const styles = {
    HLA: {
      color: '#66bb6a',       // green
      fontWeight: 500,
      borderBottom: '1px dotted #66bb6a',
    },
    HLD: {
      color: '#ffb74d',       // orange
      fontWeight: 500,
      borderBottom: '1px dotted #ffb74d',
    },
    HLP: {
      color: '#29b6f6',       // blue
      fontWeight: 500,
      borderBottom: '1px dotted #29b6f6',
    },
    HLDS: {
      color: '#ef5350',       // red
      fontWeight: 500,
      borderBottom: '1px dotted #ef5350',
    },
  };

  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(text)) !== null) {
    const [fullMatch, tagName, insideText] = match;
    const start = match.index;

    // Plain text before match
    if (start > lastIndex) {
      segments.push(text.slice(lastIndex, start));
    }

    // Highlighted piece
    segments.push(
      <span key={`hl-${start}`} style={styles[tagName]}>
        {insideText}
      </span>
    );

    lastIndex = tagRegex.lastIndex;
  }

  // Remainder
  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  return segments;
}



const SupportItem = ({ support, onUpdate }) => {
  const springProps = useSpring({ opacity: 1, config: { tension: 1000 }, reset: true });

  const handleDepartmentChange = (dept) => {
    onUpdate(support._id, { department: dept });
  };

  const handleStatusChange = (status) => {
    onUpdate(support._id, { status });
  };

  return (
    <AnimatedCard style={springProps} sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6">
          {support.category} - {support.subcategory}
        </Typography>
        <Typography variant="body2">{support.issue}</Typography>
        <Typography variant="caption" color="text.secondary">
          {new Date(support.createdAt).toLocaleString()}
        </Typography>
        <Stack direction="row" spacing={1} mt={2}>
          <Button
            variant={support.department === 'production' ? 'contained' : 'outlined'}
            onClick={() => handleDepartmentChange('production')}
            size="small"
            sx={{ textTransform: 'none', fontSize: '0.8rem' }}
          >
            Production Team
          </Button>
          <Button
            variant={support.department === 'marketing' ? 'contained' : 'outlined'}
            onClick={() => handleDepartmentChange('marketing')}
            size="small"
            sx={{ textTransform: 'none', fontSize: '0.8rem' }}
          >
            Marketing Team
          </Button>
        </Stack>
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          {['pending', 'resolved', 'unresolved'].map((status) => (
            <Chip
              key={status}
              label={status.charAt(0).toUpperCase() + status.slice(1)}
              clickable
              color={support.status === status ? 'primary' : 'default'}
              onClick={() => handleStatusChange(status)}
            />
          ))}
        </Box>
        <Typography
          variant="body2"
          sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}
        >
          {support.status === 'resolved' ? (
            <>
              <span>Resolved by:</span> {support.resolvedBy}
            </>
          ) : (
            <>
              <span>Being resolved by:</span> Support Team
            </>
          )}
        </Typography>


        <Stack direction="row" spacing={1} mt={2}>
          {support.mobile && (
            <Tooltip title="Chat on WhatsApp">
              <IconButton
                component="a"
                href={`https://wa.me/${support.mobile.replace(/[^\d]/g, '').replace(/^(\d{10})$/, '91$1').replace(/^(\d{12})$/, '$1')}`}
                target="_blank"
              >
                <WhatsAppIcon color="success" />
              </IconButton>
            </Tooltip>
          )}
 

          {support.email && (
            <Tooltip title="Send Email">
              <IconButton component="a" href={`mailto:${support.email}`}>
                <EmailIcon color="primary" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

                 {/* AI Response section */}
                 {support.aiResponse && (
          <Box sx={{ mt: 2, p: 1, border: '1px solid #444', borderRadius: '4px' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: '600', mb: 1 }}>
              AI Response
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontSize: '0.9rem', lineHeight: 1.5, color: '#eee' }}
            >
              {formatAiResponse(support.aiResponse)}
            </Typography>
          </Box>
        )}
      </CardContent>
    </AnimatedCard>
  );
};

export default React.memo(SupportItem);
