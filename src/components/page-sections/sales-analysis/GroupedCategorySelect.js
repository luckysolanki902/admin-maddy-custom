import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  TextField,
  Autocomplete,
  Typography,
  ListSubheader,
  Checkbox,
  InputAdornment,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Avatar,
  CircularProgress,
  alpha,
  InputBase,
  Button,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/system';
import CategoryIcon from '@mui/icons-material/Category';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CloseIcon from '@mui/icons-material/Close';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import Image from 'next/image';

// Styled components
const StyledAutocomplete = styled(Autocomplete)(({ theme }) => ({
  '& .MuiAutocomplete-tag': {
    margin: 2,
    height: 28,
  },
  '& .MuiInputBase-root': {
    padding: '2px 8px',
    borderRadius: 8,
  },
  '& .MuiAutocomplete-input': {
    padding: '8px 4px !important',
  }
}));

const StyledSearchBox = styled(InputBase)(({ theme }) => ({
  padding: '8px 12px',
  width: '100%',
  borderRadius: 8,
  backgroundColor: alpha(theme.palette.background.default, 0.8),
  border: `1px solid ${theme.palette.divider}`,
  '&:hover': {
    backgroundColor: alpha(theme.palette.background.default, 1),
    border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
  },
  '&.Mui-focused': {
    backgroundColor: alpha(theme.palette.background.default, 1),
    border: `1px solid ${theme.palette.primary.main}`,
    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
  }
}));

// Ensure shouldForwardProp is correctly configured to prevent $expanded from reaching the DOM.
const CategoryGroup = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$expanded',
})(({ theme, $expanded }) => ({
  margin: '8px 0',
  borderRadius: 8,
  backgroundColor: $expanded ? alpha(theme.palette.primary.main, 0.04) : 'transparent',
  overflow: 'hidden',
  transition: 'all 0.2s ease',
}));

const GroupHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: '10px 12px',
  borderRadius: 8,
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  }
}));

const SelectionSummary = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  borderTop: `1px dashed ${theme.palette.divider}`,
  backgroundColor: alpha(theme.palette.background.default, 0.6),
}));

const GroupedCategorySelect = ({ 
  value = [], 
  onChange, 
  groupedOptions = [],
  loading = false 
}) => {
  const theme = useTheme();
  const baseCloudfrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL || '';
  
  // State for expanded groups
  const [expandedGroups, setExpandedGroups] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOptions, setFilteredOptions] = useState([]);
  
  // Processed value with objects instead of just IDs
  const [selectedOptions, setSelectedOptions] = useState([]);
  
  // Value mapping for selected options
  const [valueMap, setValueMap] = useState({});
  
  // Process and filter options when groupedOptions or search changes
  useEffect(() => {
    if (!groupedOptions.length) return;
    
    // Build a value map for faster lookups
    const newValueMap = {};
    groupedOptions.forEach(group => {
      group.options.forEach(option => {
        newValueMap[option.id] = {
          ...option,
          group: group.name
        };
      });
    });
    setValueMap(newValueMap);
    
    // Convert selected value IDs to full objects
    const newSelectedOptions = value.map(id => newValueMap[id] || { id, name: `Option ${id}` });
    setSelectedOptions(newSelectedOptions);
    
    // Filter based on search query if needed
    if (searchQuery) {
      const lowercaseQuery = searchQuery.toLowerCase();
      const filtered = groupedOptions.map(group => {
        return {
          ...group,
          options: group.options.filter(option => 
            option.name.toLowerCase().includes(lowercaseQuery)
          )
        };
      }).filter(group => group.options.length > 0);
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(groupedOptions);
    }
  }, [groupedOptions, searchQuery, value]);
  
  // Toggle group expansion
  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };
  
  // Select/deselect all options in a group
  const toggleGroupSelection = (groupId, groupOptions) => {
    const groupOptionIds = groupOptions.map(opt => opt.id);
    
    // Check if all options in this group are already selected
    const allSelected = groupOptionIds.every(id => value.includes(id));
    
    if (allSelected) {
      // Deselect all options in this group
      const newValue = value.filter(id => !groupOptionIds.includes(id));
      onChange(newValue);
    } else {
      // Select all options in this group
      const newOptionsToAdd = groupOptionIds.filter(id => !value.includes(id));
      onChange([...value, ...newOptionsToAdd]);
    }
  };
  
  // Toggle single option selection
  const toggleOption = (optionId) => {
    const isSelected = value.includes(optionId);
    
    if (isSelected) {
      onChange(value.filter(id => id !== optionId));
    } else {
      onChange([...value, optionId]);
    }
  };
  
  // Count selected options per group
  const getSelectedCountByGroup = (groupId) => {
    const group = groupedOptions.find(g => g.id === groupId);
    if (!group) return 0;
    
    const groupOptionIds = group.options.map(opt => opt.id);
    return groupOptionIds.filter(id => value.includes(id)).length;
  };
  
  // Handle search input change
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };
  
  // Clear all selected options
  const handleClearAll = () => {
    onChange([]);
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      {/* Search bar */}
      <Box sx={{ mb: 2, position: 'sticky', top: 0, zIndex: 2, backgroundColor: theme.palette.background.paper, py: 1 }}>
        <StyledSearchBox
          placeholder="Search categories or variants..."
          value={searchQuery}
          onChange={handleSearchChange}
          startAdornment={
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          }
          endAdornment={
            searchQuery ? (
              <InputAdornment position="end">
                <Button
                  size="small"
                  onClick={() => setSearchQuery('')}
                  sx={{ minWidth: '30px', p: 0.5 }}
                >
                  <CloseIcon fontSize="small" />
                </Button>
              </InputAdornment>
            ) : null
          }
        />
      </Box>

      {/* Selected chips summary */}
      {selectedOptions.length > 0 && (
        <Paper 
          variant="outlined" 
          sx={{ 
            mb: 2, 
            p: 1, 
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.5,
            borderRadius: 2,
            borderColor: theme.palette.divider
          }}
        >
          {selectedOptions.map((option) => (
            <Chip
              key={option.id}
              label={option.name}
              size="small"
              onDelete={() => toggleOption(option.id)}
              sx={{ 
                m: 0.25,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                }
              }}
            />
          ))}
          
          {selectedOptions.length > 0 && (
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                width: '100%',
                mt: 1,
                pt: 1,
                borderTop: `1px dashed ${theme.palette.divider}`
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {selectedOptions.length} {selectedOptions.length === 1 ? 'variant' : 'variants'} selected
              </Typography>
              <Button 
                size="small" 
                onClick={handleClearAll}
                variant="text"
                color="error"
                sx={{ minHeight: 0, py: 0.5 }}
              >
                Clear All
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* Loading state */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={30} />
        </Box>
      ) : filteredOptions.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <CategoryOutlinedIcon color="action" sx={{ fontSize: 40, opacity: 0.5, mb: 1 }} />
          <Typography color="text.secondary">
            {searchQuery ? 'No variants match your search' : 'No variants available'}
          </Typography>
        </Box>
      ) : (
        // Category groups
        filteredOptions.map((group) => {
          const isExpanded = !!expandedGroups[group.id];
          const selectedCount = getSelectedCountByGroup(group.id);
          const allSelected = selectedCount === group.options.length;
          const someSelected = selectedCount > 0 && selectedCount < group.options.length;
          
          return (
            <CategoryGroup key={group.id} $expanded={isExpanded}>
              <GroupHeader 
                onClick={() => toggleGroup(group.id)}
                sx={{ 
                  bgcolor: isExpanded ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                }}
              >
                <Checkbox
                  icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                  checkedIcon={<CheckBoxIcon fontSize="small" />}
                  indeterminate={someSelected}
                  checked={allSelected}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroupSelection(group.id, group.options);
                  }}
                  sx={{ p: 0.5, mr: 1 }}
                />
                <Typography 
                  variant="subtitle1" 
                  component="span" 
                  sx={{ 
                    flex: 1, 
                    fontWeight: 500,
                    color: allSelected || someSelected ? theme.palette.primary.main : 'inherit' 
                  }}
                >
                  {group.name}
                </Typography>
                <Chip 
                  label={`${selectedCount}/${group.options.length}`}
                  size="small"
                  color={allSelected ? "primary" : "default"}
                  variant={allSelected || someSelected ? "filled" : "outlined"}
                  sx={{ 
                    fontWeight: 500, 
                    mr: 1,
                    opacity: selectedCount > 0 ? 1 : 0.7,
                  }}
                />
                {isExpanded ? 
                  <ExpandLessIcon fontSize="small" color="action" /> : 
                  <ExpandMoreIcon fontSize="small" color="action" />
                }
              </GroupHeader>
              
              <Collapse in={isExpanded}>
                <List dense disablePadding sx={{ pl: 4 }}>
                  {group.options.map((option) => {
                    const isItemSelected = value.includes(option.id);
                    
                    return (
                      <ListItem 
                        key={option.id} 
                        dense 
                        // Ensure 'button' prop is not used when component is 'div'.
                        // onClick and sx provide interactivity and styling.
                        component="div" 
                        onClick={() => toggleOption(option.id)}
                        sx={{ 
                          borderRadius: 1,
                          py: 0.5,
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                          }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Checkbox
                            edge="start"
                            checked={isItemSelected}
                            tabIndex={-1}
                            size="small"
                            sx={{ p: 0.5 }}
                          />
                        </ListItemIcon>
                        
                        {option.thumbnail && (
                          <Avatar sx={{ width: 24, height: 24, mr: 1 }}>
                            <Image
                              src={option.thumbnail ?
                                `${baseCloudfrontUrl}${option.thumbnail.startsWith('/') ? option.thumbnail : '/' + option.thumbnail}` :
                                '/placeholder.png'}
                              alt={option.name}
                              width={24}
                              height={24}
                            />
                          </Avatar>
                        )}
                        
                        <ListItemText 
                          primary={option.name} 
                          primaryTypographyProps={{ 
                            variant: 'body2',
                            sx: {
                              fontWeight: isItemSelected ? 500 : 400,
                              color: isItemSelected ? theme.palette.primary.main : 'inherit'
                            }
                          }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </Collapse>
            </CategoryGroup>
          );
        })
      )}
      
      {/* Summary footer */}
      {selectedOptions.length > 0 && (
        <SelectionSummary>
          <Typography variant="body2" color="text.secondary">
            {selectedOptions.length} of {Object.keys(valueMap).length} variants selected
          </Typography>
        </SelectionSummary>
      )}
    </Box>
  );
};

export default GroupedCategorySelect;
