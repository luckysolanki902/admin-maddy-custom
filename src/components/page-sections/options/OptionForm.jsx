'use client';

import React, { useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  IconButton,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageUpload from '@/components/utils/ImageUpload';

const OptionForm = ({
  product,
  baseSku,
  serial,
  onAdded,        // callback(optionObject)
}) => {
  const [sku, setSku]           = useState(`${baseSku}-${serial}`);
  const [pairs, setPairs]       = useState([{ k: '', v: '' }]);
  const [images, setImages]     = useState([]);
  const [thumbType, setThumbType]   = useState('hex');   // 'hex' | 'image'
  const [thumbnail, setThumbnail]   = useState('');      // hex or File
  const [saving, setSaving]     = useState(false);

  const handlePairChange = (idx, field, value) => {
    setPairs((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );
  };

  const addPair = () => setPairs((prev) => [...prev, { k: '', v: '' }]);
  const removePair = (idx) =>
    setPairs((prev) => prev.filter((_, i) => i !== idx));

  // ===== submit ===========================================================
  const submit = async () => {
    if (!sku.trim()) {
      return alert('SKU is required');
    }
    if (!images.length) {
      return alert('At least one image is required');
    }

    // build optionDetails map
    const optionDetails = pairs.reduce((acc, { k, v }) => {
      if (k.trim() && v.trim()) acc[k.trim()] = v.trim();
      return acc;
    }, {});

    setSaving(true);
    try {
      // ---- paths & uploads ----------------------------------------------
      const basePath = `options/${baseSku}/${sku}`;
      const imgPaths = images.map((_, i) => `${basePath}-${i + 1}.jpg`);

      const getPresignedUrl = async (fullPath, type) => {
        const res = await fetch('/api/admin/aws/generate-presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullPath, fileType: type }),
        });
        if (!res.ok) throw new Error('presign fail');
        return res.json();
      };

      const uploadFile = async (file, url) =>
        fetch(url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });

      // ⇢ product images
      const signed = await Promise.all(
        imgPaths.map((p, i) => getPresignedUrl(p, images[i].type))
      );
      await Promise.all(
        signed.map(({ presignedUrl }, i) => uploadFile(images[i], presignedUrl))
      );

      // ⇢ thumbnail (if image mode)
      let thumbnailPath = '';
      if (thumbType === 'image' && thumbnail) {
        const thumbFile  = thumbnail;                    // File
        thumbnailPath    = `${basePath}-thumb.jpg`;
        const { presignedUrl } = await getPresignedUrl(
          thumbnailPath,
          thumbFile.type
        );
        await uploadFile(thumbFile, presignedUrl);
      }

      // ---- payload -------------------------------------------------------
      const payload = {
        product     : product._id,
        sku,
        optionDetails,
        images      : imgPaths.map((p) => '/' + p),
        thumbnail   : thumbType === 'hex' ? thumbnail : '/' + thumbnailPath,
      };

      const res = await fetch('/api/admin/manage/option/add', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'save fail');
      }
      const saved = await res.json();
      onAdded(saved);          // bubble up
      // reset
      setSku(`${baseSku}-${serial + 1}`);
      setPairs([{ k: '', v: '' }]);
      setImages([]);
      setThumbnail('');
      setThumbType('hex');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // =======================================================================

  return (
    <Box sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="h6" mb={2}>Add Option</Typography>

      <Grid container spacing={2}>
        {/* SKU */}
        <Grid item xs={12}>
          <TextField
            label="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            fullWidth
          />
        </Grid>

        {/* key‑value pairs */}
        <Grid item xs={12}>
          <Typography variant="subtitle2" gutterBottom>Option Details (key / value)</Typography>
          {pairs.map((pair, idx) => (
            <Grid container spacing={1} alignItems="center" key={idx} sx={{ mb: 1 }}>
              <Grid item xs={5}>
                <TextField
                  placeholder="Key"
                  value={pair.k}
                  onChange={(e) => handlePairChange(idx, 'k', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={5}>
                <TextField
                  placeholder="Value"
                  value={pair.v}
                  onChange={(e) => handlePairChange(idx, 'v', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={2}>
                <IconButton onClick={() => removePair(idx)}><DeleteIcon /></IconButton>
              </Grid>
            </Grid>
          ))}
          <Button size="small" onClick={addPair}>+ Add Row</Button>
        </Grid>

        {/* images */}
        <Grid item xs={12}>
          <ImageUpload
            label="Option Images (JPG)"
            accept="image/jpeg"
            multiple
            files={images}
            onFilesChange={setImages}
            max={5}
          />
        </Grid>

        {/* thumbnail */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="thumb-type">Thumbnail Type</InputLabel>
            <Select
              labelId="thumb-type"
              value={thumbType}
              label="Thumbnail Type"
              onChange={(e) => {
                setThumbType(e.target.value);
                setThumbnail('');
              }}
            >
              <MenuItem value="hex">Hex Code</MenuItem>
              <MenuItem value="image">Image</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          {thumbType === 'hex' ? (
            <TextField
              label="Hex Code (e.g. #ff0000)"
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              fullWidth
            />
          ) : (
            <ImageUpload
              label="Thumbnail Image (JPG/PNG)"
              accept="image/*"
              files={thumbnail ? [thumbnail] : []}
              onFilesChange={(files) => setThumbnail(files[0] || '')}
            />
          )}
        </Grid>

        {/* submit */}
        <Grid item xs={12}>
          <Button
            variant="contained"
            onClick={submit}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Option'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OptionForm;
