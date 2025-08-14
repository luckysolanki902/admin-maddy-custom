'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Chip,
  Paper,
  IconButton,
  Tooltip,
  Grid,
  LinearProgress,
  useTheme,
  alpha
} from '@mui/material';
import { styled } from '@mui/system';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import TagIcon from '@mui/icons-material/Tag';
import LinkIcon from '@mui/icons-material/Link';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';

// Platform character limits
const PLATFORM_LIMITS = {
  instagram: { post: 2200, story: 0, reel: 2200, carousel: 2200 },
  facebook: { post: 63206, story: 0, reel: 2200, carousel: 63206 },
  twitter: { post: 280 },
  linkedin: { post: 3000, carousel: 3000 },
  tiktok: { reel: 2200 }
};

// Common hashtags for suggestions
const POPULAR_HASHTAGS = [
  '#socialmedia', '#marketing', '#content', '#digital', '#brand',
  '#engagement', '#community', '#creative', '#inspiration', '#trending',
  '#business', '#growth', '#strategy', '#innovation', '#team'
];

// Common emojis for social media
const POPULAR_EMOJIS = [
  '😊', '🎉', '💡', '🚀', '❤️', '👍', '🔥', '✨', '💪', '🎯',
  '📱', '💻', '📊', '🎨', '🌟', '👏', '🙌', '💯', '🎪', '🎭'
];

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    fontSize: '1rem',
    lineHeight: 1.5,
    '& textarea': {
      resize: 'vertical',
      minHeight: '120px',
    }
  }
}));

const CharacterCounter = styled(Box)(({ theme, isOverLimit }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  backgroundColor: isOverLimit 
    ? alpha(theme.palette.error.main, 0.1)
    : alpha(theme.palette.primary.main, 0.05),
  borderRadius: theme.spacing(1),
  border: `1px solid ${isOverLimit ? theme.palette.error.main : theme.palette.primary.main}`,
}));

const HashtagChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.25),
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  color: theme.palette.primary.main,
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.2),
  }
}));

const EmojiButton = styled(IconButton)(({ theme }) => ({
  fontSize: '1.2rem',
  padding: theme.spacing(0.5),
  margin: theme.spacing(0.25),
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
  }
}));

export default function RichTextInput({
  value = '',
  onChange,
  placeholder = 'Write your social media content...',
  platforms = [],
  contentType = 'post',
  showHashtagSuggestions = true,
  showEmojiPicker = true,
  showCharacterCount = true,
  maxHeight = 300
}) {
  const theme = useTheme();
  const textFieldRef = useRef(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showHashtags, setShowHashtags] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [hashtagSuggestions, setHashtagSuggestions] = useState([]);

  // Calculate character limits for selected platforms
  const getCharacterLimits = () => {
    if (platforms.length === 0) return null;
    
    return platforms.map(platform => {
      const limit = PLATFORM_LIMITS[platform]?.[contentType];
      return {
        platform,
        limit: limit || 0,
        name: platform.charAt(0).toUpperCase() + platform.slice(1)
      };
    }).filter(p => p.limit > 0);
  };

  const characterLimits = getCharacterLimits();
  const currentLength = value.length;
  const minLimit = characterLimits ? Math.min(...characterLimits.map(p => p.limit)) : null;
  const isOverLimit = minLimit && currentLength > minLimit;

  // Handle text change
  const handleTextChange = (event) => {
    const newValue = event.target.value;
    onChange(newValue);
    
    // Update cursor position
    setCursorPosition(event.target.selectionStart);
    
    // Check for hashtag suggestions
    if (showHashtagSuggestions) {
      const words = newValue.split(/\s+/);
      const currentWord = words[words.length - 1];
      
      if (currentWord.startsWith('#') && currentWord.length > 1) {
        const searchTerm = currentWord.slice(1).toLowerCase();
        const suggestions = POPULAR_HASHTAGS.filter(tag => 
          tag.toLowerCase().includes(searchTerm) && tag !== currentWord
        );
        setHashtagSuggestions(suggestions.slice(0, 8));
        setShowHashtags(true);
      } else {
        setShowHashtags(false);
        setHashtagSuggestions([]);
      }
    }
  };

  // Insert text at cursor position
  const insertTextAtCursor = (textToInsert) => {
    const textarea = textFieldRef.current?.querySelector('textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + textToInsert + value.substring(end);
    
    onChange(newValue);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      const newPosition = start + textToInsert.length;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);
  };

  // Handle hashtag suggestion click
  const handleHashtagClick = (hashtag) => {
    const words = value.split(/\s+/);
    const lastWordIndex = words.length - 1;
    const currentWord = words[lastWordIndex];
    
    if (currentWord.startsWith('#')) {
      words[lastWordIndex] = hashtag;
      const newValue = words.join(' ') + ' ';
      onChange(newValue);
    }
    
    setShowHashtags(false);
    setHashtagSuggestions([]);
  };

  // Handle emoji click
  const handleEmojiClick = (emoji) => {
    insertTextAtCursor(emoji);
    setShowEmojis(false);
  };

  // Format text (bold, italic)
  const formatText = (format) => {
    const textarea = textFieldRef.current?.querySelector('textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let formattedText = '';
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      default:
        return;
    }
    
    const newValue = value.substring(0, start) + formattedText + value.substring(end);
    onChange(newValue);
    
    // Select the formatted text
    setTimeout(() => {
      const newStart = start + (format === 'bold' ? 2 : 1);
      const newEnd = newStart + selectedText.length;
      textarea.setSelectionRange(newStart, newEnd);
      textarea.focus();
    }, 0);
  };

  // Extract hashtags from text
  const extractHashtags = () => {
    const hashtagRegex = /#[\w]+/g;
    return value.match(hashtagRegex) || [];
  };

  const hashtags = extractHashtags();

  return (
    <Box>
      {/* Formatting toolbar */}
      {/* <Paper 
        elevation={0} 
        sx={{ 
          p: 1, 
          mb: 1, 
          bgcolor: alpha(theme.palette.primary.main, 0.05),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          borderRadius: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Tooltip title="Bold (surround with **)">
            <IconButton size="small" onClick={() => formatText('bold')}>
              <FormatBoldIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Italic (surround with *)">
            <IconButton size="small" onClick={() => formatText('italic')}>
              <FormatItalicIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          {showHashtagSuggestions && (
            <Tooltip title="Show hashtag suggestions">
              <IconButton 
                size="small" 
                onClick={() => setShowHashtags(!showHashtags)}
                color={showHashtags ? 'primary' : 'default'}
              >
                <TagIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          {showEmojiPicker && (
            <Tooltip title="Add emoji">
              <IconButton 
                size="small" 
                onClick={() => setShowEmojis(!showEmojis)}
                color={showEmojis ? 'primary' : 'default'}
              >
                <EmojiEmotionsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          <Box sx={{ flexGrow: 1 }} />
          
          {showCharacterCount && characterLimits && (
            <Typography variant="caption" color={isOverLimit ? 'error' : 'textSecondary'}>
              {currentLength} chars
            </Typography>
          )}
        </Box>
      </Paper> */}

      {/* Main text input */}
      <StyledTextField
        ref={textFieldRef}
        fullWidth
        multiline
        variant="outlined"
        placeholder={placeholder}
        value={value}
        onChange={handleTextChange}
        error={isOverLimit}
        sx={{
          '& .MuiOutlinedInput-root': {
            maxHeight: maxHeight,
            overflow: 'auto'
          }
        }}
      />

      {/* Character count and platform limits */}
      {showCharacterCount && characterLimits && (
        <Box sx={{ mt: 1 }}>
          <Grid container spacing={1}>
            {characterLimits.map(({ platform, limit, name }) => {
              const percentage = (currentLength / limit) * 100;
              const isOverPlatformLimit = currentLength > limit;
              
              return (
                <Grid item xs={12} sm={6} md={4} key={platform}>
                  <CharacterCounter isOverLimit={isOverPlatformLimit}>
                    <Typography variant="caption" sx={{ minWidth: 60 }}>
                      {name}
                    </Typography>
                    <Box sx={{ flexGrow: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(percentage, 100)}
                        color={isOverPlatformLimit ? 'error' : percentage > 80 ? 'warning' : 'primary'}
                        sx={{ height: 4, borderRadius: 2 }}
                      />
                    </Box>
                    <Typography 
                      variant="caption" 
                      color={isOverPlatformLimit ? 'error' : 'textSecondary'}
                      sx={{ minWidth: 50, textAlign: 'right' }}
                    >
                      {currentLength}/{limit}
                    </Typography>
                  </CharacterCounter>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Hashtag suggestions */}
      {showHashtags && hashtagSuggestions.length > 0 && (
        <Paper 
          elevation={2} 
          sx={{ 
            mt: 1, 
            p: 2, 
            maxHeight: 150, 
            overflow: 'auto',
            bgcolor: theme.palette.background.paper
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Hashtag Suggestions
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {hashtagSuggestions.map(hashtag => (
              <HashtagChip
                key={hashtag}
                label={hashtag}
                size="small"
                onClick={() => handleHashtagClick(hashtag)}
                clickable
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Emoji picker */}
      {showEmojis && (
        <Paper 
          elevation={2} 
          sx={{ 
            mt: 1, 
            p: 2, 
            maxHeight: 200, 
            overflow: 'auto',
            bgcolor: theme.palette.background.paper
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Popular Emojis
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
            {POPULAR_EMOJIS.map(emoji => (
              <EmojiButton
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                title={`Add ${emoji}`}
              >
                {emoji}
              </EmojiButton>
            ))}
          </Box>
        </Paper>
      )}

      {/* Current hashtags display */}
      {hashtags.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Hashtags in your content ({hashtags.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {hashtags.map((hashtag, index) => (
              <Chip
                key={`${hashtag}-${index}`}
                label={hashtag}
                size="small"
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Content preview for formatting */}
      {value && (value.includes('**') || value.includes('*')) && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Formatted Preview
          </Typography>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2, 
              bgcolor: alpha(theme.palette.background.paper, 0.5),
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1
            }}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                whiteSpace: 'pre-wrap',
                '& strong': { fontWeight: 'bold' },
                '& em': { fontStyle: 'italic' }
              }}
              dangerouslySetInnerHTML={{
                __html: value
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/(#\w+)/g, '<span style="color: #1976d2; font-weight: 500;">$1</span>')
              }}
            />
          </Paper>
        </Box>
      )}
    </Box>
  );
}