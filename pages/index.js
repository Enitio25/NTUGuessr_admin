import React, { useState, useEffect } from 'react';
import { supabase, getPublicUrl } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
} from '@mui/material';

const MapPopup = dynamic(() => import('@/components/MapPopup'), { ssr: false });

export default function Home() {
  const [items, setItems] = useState([]);
  const [selectedFilename, setSelectedFilename] = useState(null);
  const [loading, setLoading] = useState(true);

  // Editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editedPosition, setEditedPosition] = useState({ lat: null, lng: null });

  // API calls

  // 1. Handle image approval
  async function approveHandler(item) {
    const { filename, lat, lng } = item;

    // 1. Insert into `images` table
    const { error: insertError } = await supabase
      .from('locs') // your approved table
      .insert([{ filename, lat, lng }]);

    if (insertError) {
      console.error('Error inserting into images:', insertError.message);
      return;
    }

    // 2. Copy image to `images` bucket
    const { error: copyError } = await supabase.storage
      .from('locs')
      .move(`not_approved/${filename}.jpg`, `image/${filename}.jpg`); // target is `images` bucket

    if (copyError) {
      console.error('Error moving image to approved directory:', copyError.message);
      return;
    }

    // 3. Delete from `need_approval` table
    const { error: deleteApprovalError } = await supabase
      .from('need_approval')
      .delete()
      .eq('filename', filename);

    if (deleteApprovalError) {
      console.error('Error deleting from need_approval:', deleteApprovalError.message);
      return;
    }

    // Update UI
    setItems((prev) => prev.filter((i) => i.filename !== filename));
    setSelectedFilename(null);
  }

  // 2. Handle rejected images
  async function rejectHandler(item) {
    const { filename, lat, lng } = item;

    const { error: deleteError } = await supabase
      .from('need_approval')
      .delete()
      .eq('filename', filename);
    if (deleteError) return console.error('Delete error:', deleteError.message);

    const { error: storageError } = await supabase.storage
      .from('not_approved')
      .remove([filename]);
    if (storageError) return console.error('Storage delete error:', storageError.message);
    setItems((prev) => prev.filter((i) => i.filename !== filename));
    setSelectedFilename(null);
  }



  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase.from('need_approval').select('*');
      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      setItems(data);
      setSelectedFilename(data[0]?.filename || null);
      setLoading(false);
    }
    fetchData();
  }, []);

  const selectedItem = items.find((item) => item.filename === selectedFilename);

  // Reset edited position and editing mode when selected item changes
  useEffect(() => {
    if (selectedItem) {
      setEditedPosition({ lat: selectedItem.lat, lng: selectedItem.lng });
      setIsEditing(false);
    }
  }, [selectedItem]);

  // Called by MapPopup when user clicks map to select new location
  const handlePositionChange = ({ lat, lng }) => {
    if (isEditing) {
      setEditedPosition({ lat, lng });
    }
  };

  // Save edited location back to the items array
  const handleSave = () => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.filename === selectedFilename
          ? { ...item, lat: editedPosition.lat, lng: editedPosition.lng }
          : item
      )
    );
    setIsEditing(false);
  };

  // Cancel editing, revert to original lat/lng
  const handleCancel = () => {
    setEditedPosition({ lat: selectedItem.lat, lng: selectedItem.lng });
    setIsEditing(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Left Panel: List */}
      <Box sx={{ width: '33%', height: '100%', p: 2, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h5" gutterBottom>
          Images
        </Typography>

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            gap: 2,
            scrollbarWidth: 'thin',
            scrollbarColor: '#2196f3 #1e1e1e',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#1e1e1e',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#2196f3',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              backgroundColor: '#1976d2',
            },
          }}
        >
          {items.map((item) => (
            <Box
              key={item.filename}
              sx={{
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                bgcolor: item.filename === selectedFilename ? '#32495dff' : '#2c2c2c',
                p: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: '#32495dff' },
              }}
              onClick={() => setSelectedFilename(item.filename)}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <Typography variant="body1" noWrap>
                  {item.filename}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {item.lat}, {item.lng}
                </Typography>
              </Box>

              <Box
                component="img"
                src={getPublicUrl(item.filename)}
                alt={item.filename}
                sx={{
                  width: 80,
                  height: 80,
                  objectFit: 'cover',
                  borderRadius: 1,
                  ml: 2,
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>

      {/* Right Panel: Map and overlay */}
      <Box sx={{ width: '67%', p: 2 }}>
        {selectedItem ? (
          <Box sx={{ position: 'relative', height: '100%', borderRadius: '15px', overflow: 'hidden' }}>
            <MapPopup
              lat={editedPosition.lat}
              lng={editedPosition.lng}
              isEditing={isEditing}
              onPositionChange={handlePositionChange}
            />
            <Box
              sx={{
                position: 'absolute',
                top: 10,
                left: 10,
                bgcolor: 'rgba(0, 0, 0, 0.6)',
                p: 1,
                borderRadius: 2,
                maxWidth: 300,
                color: 'white',
                boxShadow: 3,
                zIndex: 1000,
              }}
            >
              <Box
                component="img"
                src={getPublicUrl(selectedItem.filename)}
                alt={selectedItem.filename}
                sx={{ width: '100%', borderRadius: 1, mb: 1 }}
              />

              <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                {!isEditing ? (
                  <>
                    <Button variant="outlined" color="primary" fullWidth onClick={() => setIsEditing(true)}>
                      Edit
                    </Button>
                    <Button variant="contained" color="success" fullWidth onClick={() => approveHandler(selectedItem)}>
                      Approve
                    </Button>
                    <Button variant="contained" color="error" fullWidth onClick={() => rejectHandler(selectedItem)}>
                      Reject
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="contained" color="primary" fullWidth onClick={handleSave}>
                      Save
                    </Button>
                    <Button variant="outlined" color="inherit" fullWidth onClick={handleCancel}>
                      Cancel
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          </Box>
        ) : (
          <Typography>No item selected.</Typography>
        )}
      </Box>
    </Box>
  );
}
