import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Chip, 
  Typography, 
  CircularProgress,
  Alert
} from '@mui/material';
import { Add as AddIcon, AutoAwesome as AIIcon } from '@mui/icons-material';

const SearchKeywords = ({ 
  keywords = [], 
  onKeywordsChange, 
  productData = {},
  disabled = false 
}) => {
  const [newKeyword, setNewKeyword] = useState('');
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestedKeywords, setSuggestedKeywords] = useState([]);
  const [error, setError] = useState('');

  const handleAddKeyword = (keyword = null) => {
    const keywordToAdd = keyword || newKeyword.trim();
    if (keywordToAdd && !keywords.includes(keywordToAdd)) {
      const updatedKeywords = [...keywords, keywordToAdd];
      onKeywordsChange(updatedKeywords);
      if (!keyword) setNewKeyword(''); // Only clear input if adding from text field
      
      // Remove from suggestions if it was a suggested keyword
      if (keyword) {
        setSuggestedKeywords(prev => prev.filter(k => k !== keyword));
      }
    }
  };

  const handleRemoveKeyword = (keywordToRemove) => {
    const updatedKeywords = keywords.filter(keyword => keyword !== keywordToRemove);
    onKeywordsChange(updatedKeywords);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleGetSuggestions = async () => {
    setIsLoadingSuggestions(true);
    setError('');
    
    try {
      const timestamp = Date.now(); // For cache busting
      
      // Get image URL and handle different formats
      let imageUrl = productData.images?.[0] || '';
      
      // If it's a blob URL (from file upload), don't use it for AI analysis
      if (imageUrl && imageUrl.startsWith('blob:')) {
        imageUrl = '';
      }
      
      // If it's a relative path, make it absolute
      if (imageUrl && imageUrl.startsWith('/') && !imageUrl.startsWith('//')) {
        imageUrl = `${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL || ''}${imageUrl}`;
      }
      
      const response = await fetch('/api/admin/products/suggest-keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({
          title: productData.title || '',
          mainTags: productData.mainTags || [],
          imageUrl: imageUrl,
          timestamp: timestamp
        })
      });

      const data = await response.json();
      
      if (response.ok && data.keywords) {
        // Filter out keywords that already exist
        const newKeywords = data.keywords.filter(keyword => 
          !keywords.some(existing => 
            existing.toLowerCase() === keyword.toLowerCase()
          )
        );
        
        // Set as suggestions instead of adding directly
        setSuggestedKeywords(newKeywords);
      } else {
        setError(data.error || 'Failed to get keyword suggestions');
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
      setError('Failed to get keyword suggestions. Please try again.');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Search Keywords
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Add keywords that describe the design, theme, style, and visual elements of this product
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Add keyword input */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Add a keyword (e.g., floral, geometric, vintage)"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          sx={{ flexGrow: 1 }}
        />
        <Button
          variant="outlined"
          onClick={handleAddKeyword}
          disabled={!newKeyword.trim() || disabled}
          startIcon={<AddIcon />}
        >
          Add
        </Button>
        <Button
          variant="contained"
          onClick={handleGetSuggestions}
          disabled={isLoadingSuggestions || disabled}
          startIcon={
            isLoadingSuggestions ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <AIIcon />
            )
          }
          sx={{ 
            background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
            '&:hover': {
              background: 'linear-gradient(45deg, #FF5252, #26C6DA)',
            }
          }}
        >
          {isLoadingSuggestions ? 'Getting...' : 'AI Suggest'}
        </Button>
      </Box>

      {/* AI Suggested Keywords */}
      {suggestedKeywords.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main', fontWeight: 600 }}>
            ✨ AI Suggestions - Click to add:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {suggestedKeywords.map((keyword, index) => (
              <Button
                key={index}
                variant="outlined"
                size="small"
                onClick={() => handleAddKeyword(keyword)}
                startIcon={<AddIcon />}
                sx={{
                  borderColor: '#1976d2',
                  color: '#1976d2',
                  backgroundColor: 'transparent',
                  '&:hover': {
                    backgroundColor: '#1976d2',
                    color: '#ffffff',
                    borderColor: '#1976d2',
                  },
                  textTransform: 'none',
                  borderRadius: 2,
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                {keyword}
              </Button>
            ))}
          </Box>
        </Box>
      )}

      {/* Added Keywords display */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {keywords.length > 0 ? (
          keywords.map((keyword, index) => (
            <Chip
              key={index}
              label={keyword}
              onDelete={disabled ? undefined : () => handleRemoveKeyword(keyword)}
              variant="outlined"
              sx={{
                '& .MuiChip-deleteIcon': {
                  fontSize: '18px'
                }
              }}
            />
          ))
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            No keywords added yet. Use the AI Suggest button to get started!
          </Typography>
        )}
      </Box>
      
      {keywords.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {keywords.length} keyword{keywords.length !== 1 ? 's' : ''} added
        </Typography>
      )}
    </Box>
  );
};

export default SearchKeywords;
