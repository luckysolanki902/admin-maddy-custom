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

const AnimatedCard = animated(Card);

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
            <span>Resolved by:</span>
          ) : (
            <span>Being resolved by:</span>
          )}
          {support.status === 'resolved' || support.status === 'pending' ? (
              <Chip label={support.resolvedBy} size="small" />
            ) : (
            <Chip label="Support Team" size="small" />
            )}
        </Typography>
        <Stack direction="row" spacing={1} mt={2}>
          {support.mobile && (
            <Tooltip title="Chat on WhatsApp">
              <IconButton
                component="a"
                href={`https://wa.me/${support.mobile}`}
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
      </CardContent>
    </AnimatedCard>
  );
};

export default React.memo(SupportItem);
