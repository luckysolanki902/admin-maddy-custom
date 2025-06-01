'use client';
// File: components/full-page-comps/CatalogueDownloader.jsx
import React, { useEffect, useState, useRef } from 'react';
import { 
  Button, 
  Paper, 
  Typography, 
  Box, 
  CircularProgress, 
  Container, 
  Grid, 
  Card, 
  CardContent,
  Fade,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  Download as DownloadIcon, 
  Visibility as PreviewIcon,
  Category as CategoryIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';

import styles from '@/components/full-page-comps/styles/catalogue-downloader.module.css';
import CatalogueCategorySelector from '../page-sections/catalogue-downloader/CatalogueCategorySelector';
import CataloguePreview from '@/components/page-sections/catalogue-downloader/CataloguePreview';

export default function CatalogueDownloader() {
  const [categories, setCategories] = useState([]);
  const [variants, setVariants] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preparing, setPreparing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // PDF Print ref - updated for new react-to-print API
  const pdfRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: pdfRef,
    documentTitle: `MaddyCustom-Catalogue-${new Date().toISOString().split('T')[0]}`,
    onBeforeGetContent: async () => {
      // This is called by react-to-print right before it captures content.
      // The preloading should ideally happen *before* handlePrint is called.
      // However, if react-to-print itself triggers this, we ensure preparation.
      setPreparing(true);
      if (!showPreview) {
        setShowPreview(true);
        // Give React time to render the preview content if it was hidden
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      // The actual image preloading is now part of handleDownloadPDF
    },
    onAfterPrint: () => {
      setPreparing(false);
    },
    removeAfterPrint: false,
    pageStyle: `
      @page {
        size: A4;
        margin: 0;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        img {
          max-width: 100% !important;
          height: auto !important;
          page-break-inside: avoid !important;
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `,
    copyStyles: true, // Crucial for MUI styles
  });

  // Fetch data from our API
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/product-related-data');
        const json = await res.json();
        if (json.success) {
          setCategories(json.data.categories);
          setVariants(json.data.variants);
          setProducts(json.data.products);
          // Select all categories by default
          setSelectedCategoryIds(json.data.categories.map(cat => cat._id));
        } else {
          throw new Error(json.error || 'Failed to fetch data');
        }
      } catch (err) {
        console.error('Error fetching data', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Toggle category selection
  const handleCategoryChipClick = (categoryId) => {
    setSelectedCategoryIds((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  // Custom print handler with validation
  const handleDownloadPDF = async () => {
    if (selectedCategoryIds.length === 0) {
      alert('Please select at least one category before downloading.');
      return;
    }
    setPreparing(true);

    // Step 1: Ensure the preview content is rendered
    if (!showPreview) {
      setShowPreview(true);
      // Wait for React to render the preview content
      await new Promise(resolve => setTimeout(resolve, 1000)); // Increased time for complex renders
    }

    // Step 2: Preload images within the rendered preview content
    const preloadImagesInRef = (refElement) => {
      return new Promise((resolve, reject) => {
        if (!refElement) {
          console.warn('Preload images: refElement is null.');
          resolve(); // Resolve if no element to scan
          return;
        }

        const images = refElement.querySelectorAll('img');
        if (images.length === 0) {
          console.log('Preload images: No images found to preload.');
          resolve(); // Resolve if no images
          return;
        }

        let loadedCount = 0;
        const totalImages = images.length;
        console.log(`Preload images: Found ${totalImages} images.`);

        const imageLoadPromises = Array.from(images).map(imgTag => {
          return new Promise((imgResolve, imgReject) => {
            if (imgTag.complete && imgTag.naturalHeight !== 0) {
              imgResolve(); // Already loaded
            } else {
              const newImg = new Image(); // Use a new Image object to force load
              newImg.onload = () => {
                console.log(`Image loaded: ${imgTag.src}`);
                imgResolve();
              };
              newImg.onerror = () => {
                console.warn(`Image failed to load: ${imgTag.src}`);
                imgResolve(); // Resolve even on error to not block printing entirely
              };
              newImg.src = imgTag.src; // Assign src to start loading
            }
          });
        });
        
        Promise.all(imageLoadPromises)
          .then(() => {
            console.log('All image preloading attempts finished.');
            resolve();
          })
          .catch(error => {
            console.error('Error during image preloading phase:', error);
            reject(error); // This reject might not be ideal, consider resolving
          });

        // Safety timeout in case some images never resolve (e.g., broken links)
        setTimeout(() => {
            console.warn('Image preloading timeout reached.');
            resolve(); 
        }, 20000); // 20 seconds timeout
      });
    };

    try {
      console.log('Starting image preloading...');
      await preloadImagesInRef(pdfRef.current);
      console.log('Image preloading complete. Triggering print.');
      // A short delay after preloading before print can sometimes help browsers
      await new Promise(resolve => setTimeout(resolve, 500)); 
      handlePrint(); // This will call onBeforeGetContent again, but preloading is done
    } catch (error) {
      console.error('Error during PDF generation process:', error);
      alert('An error occurred while preparing the PDF. Please try again.');
      setPreparing(false);
    }
    // setPreparing(false) is now handled by onAfterPrint or in catch
  };
  
  if (loading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh" 
        sx={{ 
          backgroundColor: '#1a1a1a',
          padding: 2
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress 
            size={60} 
            thickness={4}
            sx={{ 
              color: '#2d2d2d',
              mb: 3,
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              }
            }} 
          />
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#ffffff',
              fontFamily: '"Montserrat", "Arial", sans-serif',
              fontWeight: 500
            }}
          >
            Loading Catalogue Data...
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#999',
              mt: 1
            }}
          >
            Preparing your product catalogue
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 8, backgroundColor: '#1a1a1a', minHeight: '100vh' }}>
        <Paper 
          elevation={3}
          sx={{ 
            p: 4, 
            textAlign: 'center',
            borderRadius: 3,
            backgroundColor: '#2d2d2d',
            color: '#fff'
          }}
        >
          <Typography color="error" variant="h6" gutterBottom>
            Error Loading Data
          </Typography>
          <Typography sx={{ color: '#ccc' }}>
            {error}
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      py: { xs: 2, md: 4 }
    }}>
      <Container maxWidth="xl">
        {/* Simple Header */}
        <Fade in timeout={800}>
          <Box sx={{ 
            textAlign: 'center', 
            mb: { xs: 3, md: 5 },
            py: { xs: 3, md: 4 }
          }}>
            <Typography 
              variant={isMobile ? "h4" : "h2"}
              component="h1"
              sx={{ 
                fontWeight: 700,
                color: '#ffffff',
                fontFamily: '"Montserrat", "Arial", sans-serif',
                letterSpacing: '1px',
                mb: 2
              }}
            >
              Catalogue Generator
            </Typography>
            
            <Typography 
              variant={isMobile ? "body1" : "h6"}
              sx={{ 
                color: '#ccc',
                fontFamily: '"Montserrat", "Arial", sans-serif',
                maxWidth: '600px',
                mx: 'auto',
                lineHeight: 1.6,
                fontWeight: 300
              }}
            >
              Create professional catalogues with our generator. 
              Select your categories and download a PDF instantly.
            </Typography>
          </Box>
        </Fade>

        <Grid container spacing={{ xs: 2, md: 3 }}>
          {/* Configuration Panel */}
          <Grid item xs={12} lg={5}>
            <Fade in timeout={1000} style={{ transitionDelay: '200ms' }}>
              <Card 
                elevation={8}
                sx={{ 
                  borderRadius: 2,
                  backgroundColor: '#2d2d2d',
                  border: '1px solid #404040',
                  height: 'fit-content',
                  position: 'sticky',
                  top: 20
                }}
              >
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  {/* Header */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 3,
                    pb: 2,
                    borderBottom: '1px solid #404040'
                  }}>
                    <CategoryIcon sx={{ 
                      fontSize: 28, 
                      color: '#ffffff', 
                      mr: 1 
                    }} />
                    <Typography 
                      variant="h5"
                      sx={{ 
                        fontWeight: 600,
                        color: '#ffffff',
                        fontFamily: '"Montserrat", "Arial", sans-serif'
                      }}
                    >
                      Configure Catalogue
                    </Typography>
                  </Box>

                  {/* Category Selector */}
                  <Box sx={{ mb: 4 }}>
                    <CatalogueCategorySelector
                      categories={categories}
                      selectedCategoryIds={selectedCategoryIds}
                      onToggleCategory={handleCategoryChipClick}
                    />
                  </Box>

                  {/* Stats Cards */}
                  <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid item xs={6}>
                      <Paper sx={{ 
                        p: 2, 
                        textAlign: 'center',
                        backgroundColor: '#404040',
                        color: 'white',
                        borderRadius: 2
                      }}>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {selectedCategoryIds.length}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#ccc' }}>
                          Selected Categories
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ 
                        p: 2, 
                        textAlign: 'center',
                        backgroundColor: '#1a1a1a',
                        color: 'white',
                        borderRadius: 2,
                        border: '1px solid #404040'
                      }}>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {products.filter(p => 
                            selectedCategoryIds.some(catId => 
                              variants.some(v => 
                                v.specificCategory?.toString() === catId && 
                                v._id.toString() === p.specificCategoryVariant?.toString()
                              )
                            )
                          ).length}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#ccc' }}>
                          Total Products
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Action Buttons - Updated */}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 2 
                  }}>
                    <Button 
                      variant="contained"
                      size="large"
                      onClick={handleDownloadPDF}
                      disabled={selectedCategoryIds.length === 0 || preparing}
                      startIcon={preparing ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                      sx={{ 
                        flex: 1,
                        py: 1.5,
                        fontSize: '1rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        backgroundColor: '#1a1a1a',
                        color: '#ffffff',
                        border: '1px solid #404040',
                        '&:hover': {
                          backgroundColor: '#000000',
                          borderColor: '#2d2d2d',
                        },
                        '&.Mui-disabled': {
                          backgroundColor: '#404040',
                          color: '#888',
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {preparing ? 'Generating PDF...' : 'Download PDF'}
                    </Button>

                    <Button 
                      variant="outlined"
                      size="large"
                      onClick={() => setShowPreview(!showPreview)}
                      disabled={selectedCategoryIds.length === 0}
                      startIcon={<PreviewIcon />}
                      sx={{ 
                        flex: { xs: 1, sm: 'initial' },
                        py: 1.5,
                        borderWidth: 1,
                        textTransform: 'none',
                        fontWeight: 600,
                        borderColor: '#ffffff',
                        color: '#ffffff',
                        '&:hover': {
                          borderColor: '#ffffff',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                        '&.Mui-disabled': {
                          borderColor: '#666',
                          color: '#666',
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {showPreview ? 'Hide' : 'Preview'}
                    </Button>
                  </Box>

                  {/* ...existing warning message... */}
                  {selectedCategoryIds.length === 0 && (
                    <Fade in>
                      <Box sx={{ 
                        mt: 2, 
                        p: 2, 
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderRadius: 2,
                        border: '1px solid #404040'
                      }}>
                        <Typography 
                          variant="body2"
                          sx={{ 
                            color: '#ccc',
                            textAlign: 'center',
                            fontWeight: 400
                          }}
                        >
                          Please select at least one category to proceed
                        </Typography>
                      </Box>
                    </Fade>
                  )}
                </CardContent>
              </Card>
            </Fade>
          </Grid>

          {/* Preview Section */}
          <Grid item xs={12} lg={7}>
            <Fade in timeout={1000} style={{ transitionDelay: '400ms' }}>
              <Card 
                elevation={8}
                sx={{ 
                  borderRadius: 2,
                  backgroundColor: '#2d2d2d',
                  border: '1px solid #404040',
                  minHeight: { xs: '400px', md: '600px' }
                }}
              >
                {selectedCategoryIds.length > 0 && showPreview ? (
                  <>
                    {/* Preview Header */}
                    <Box sx={{ 
                      p: { xs: 2, md: 3 },
                      borderBottom: '1px solid #404040',
                      backgroundColor: '#1a1a1a'
                    }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 2
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PreviewIcon sx={{ 
                            fontSize: 24, 
                            color: '#ffffff', 
                            mr: 1 
                          }} />
                          <Typography 
                            variant="h6"
                            sx={{ 
                              fontFamily: '"Montserrat", "Arial", sans-serif',
                              color: '#ffffff',
                              fontWeight: 600
                            }}
                          >
                            Live Preview
                          </Typography>
                        </Box>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          gap: 1, 
                          flexWrap: 'wrap' 
                        }}>
                          {selectedCategoryIds.slice(0, 3).map(id => {
                            const cat = categories.find(c => c._id === id);
                            return (
                              <Chip 
                                key={id}
                                label={cat?.name}
                                size="small"
                                sx={{ 
                                  backgroundColor: '#404040',
                                  color: 'white',
                                  fontSize: '0.75rem',
                                  border: '1px solid #666'
                                }}
                              />
                            );
                          })}
                          {selectedCategoryIds.length > 3 && (
                            <Chip 
                              label={`+${selectedCategoryIds.length - 3} more`}
                              size="small"
                              variant="outlined"
                              sx={{ 
                                fontSize: '0.75rem',
                                borderColor: '#666',
                                color: '#ccc'
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>
                    
                    {/* Preview Content - Hidden div for printing */}
                    <Box sx={{ 
                      height: { xs: '500px', md: '600px' },
                      overflow: 'auto',
                      backgroundColor: '#ffffff',
                      '&::-webkit-scrollbar': {
                        width: '8px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: '#f1f1f1',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: '#2d2d2d',
                        borderRadius: '4px',
                      },
                      '&::-webkit-scrollbar-thumb:hover': {
                        background: '#1a1a1a',
                      },
                    }}>
                      <div ref={pdfRef}>
                        <CataloguePreview
                          categories={categories}
                          variants={variants}
                          products={products}
                          selectedCategoryIds={selectedCategoryIds}
                        />
                      </div>
                    </Box>
                  </>
                ) : (
                  /* Empty State */
                  <Box sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    p: 4,
                    textAlign: 'center'
                  }}>
                    <DescriptionIcon sx={{ 
                      fontSize: 80, 
                      color: '#666',
                      mb: 2 
                    }} />
                    <Typography 
                      variant="h6" 
                      gutterBottom
                      sx={{ 
                        color: '#ffffff',
                        fontFamily: '"Montserrat", "Arial", sans-serif',
                        fontWeight: 500
                      }}
                    >
                      {selectedCategoryIds.length === 0 
                        ? 'Select Categories to Preview'
                        : 'Click Preview to View Your Catalogue'
                      }
                    </Typography>
                    <Typography 
                      variant="body2"
                      sx={{ 
                        color: '#999',
                        maxWidth: '300px',
                        lineHeight: 1.6
                      }}
                    >
                      {selectedCategoryIds.length === 0 
                        ? 'Choose categories from the configuration panel to generate a catalogue preview.'
                        : 'Click the Preview button to see how your PDF catalogue will look.'
                      }
                    </Typography>
                  </Box>
                )}
              </Card>
            </Fade>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
