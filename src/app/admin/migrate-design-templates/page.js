'use client';

import { useState } from 'react';
import { Box, Typography, Button, Card, CardContent, Alert } from '@mui/material';

export default function MigrateDesignTemplatesPage() {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState(null);

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const response = await fetch('/api/admin/migrate-design-templates', {
        method: 'POST',
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Migrate Design Templates
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="body1" paragraph>
            This migration will copy all existing single design templates to the new designTemplates array field.
            This ensures backward compatibility while enabling the new multi-template functionality.
          </Typography>
          
          <Button
            variant="contained"
            onClick={handleMigrate}
            disabled={migrating}
            sx={{ mt: 2 }}
          >
            {migrating ? 'Migrating...' : 'Start Migration'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Alert severity={result.success ? 'success' : 'error'} sx={{ mt: 2 }}>
          {result.success 
            ? `Migration completed successfully! Updated ${result.updatedCount} products.`
            : `Migration failed: ${result.error}`
          }
        </Alert>
      )}
    </Box>
  );
}