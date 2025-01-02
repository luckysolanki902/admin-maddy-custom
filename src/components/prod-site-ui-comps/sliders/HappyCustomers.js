"use client";
import { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './styles/happycustomers.module.css';
// import EditCustomerDialog from '';
import EditCustomerDialog from '@/components/page-sections/EditCustomerDialog';
import { Button, CircularProgress } from '@mui/material';

export default function HappyCustomers({ parentSpecificCategoryId, noShadow, noHeading }) {
  const baseImageUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL;
  const [happyCustomers, setHappyCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // New state for deletion
  const [deleteError, setDeleteError] = useState(null); // New state for deletion errors
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchHappyCustomers() {
      try {
        const queryParam = parentSpecificCategoryId
          ? `?parentSpecificCategoryId=${parentSpecificCategoryId}`
          : '?homepage=true';
        const response = await fetch(`/api/admin/manage/happycustomers${queryParam}`);
        const data = await response.json();

        if (data?.happyCustomers) {
          setHappyCustomers(data.happyCustomers);
        } else {
          console.warn('No happy customers found');
        }
      } catch (error) {
        console.error("Error fetching happy customers:", error);
      }
    }

    fetchHappyCustomers();
  }, [parentSpecificCategoryId]);

  const handleEditClick = (customer) => {
    setSelectedCustomer(customer);
    setIsDialogOpen(true);
  };

  const handleSave = async (updatedCustomer) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/manage/happycustomers`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _id: updatedCustomer._id,
          name: updatedCustomer.name,
          globalDisplayOrder: updatedCustomer.globalDisplayOrder,
        }),
      });

      if (response.ok) {
        const returnedCustomer = await response.json();
        setHappyCustomers((prevCustomers) =>
          prevCustomers.map((cust) =>
            cust._id === returnedCustomer._id ? returnedCustomer : cust
          )
        );
        setIsDialogOpen(false);
        setSelectedCustomer(null);
      } else {
        const errorData = await response.json();
        console.error('Failed to update customer:', errorData.message);
      }
    } catch (error) {
      console.error('Error updating customer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setSelectedCustomer(null);
  };

  const handleDeletePlacement = async (customerId) => { // Removed placementId as it's unused
    const confirmDelete = confirm("Are you sure you want to delete this placement?");
    if (!confirmDelete) return;



    try {
      setIsDeleting(true);
      setDeleteError(null);
      const response = await fetch(`/api/admin/manage/happycustomers`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          parentSpecificCategoryId,
        }),
      });

      if (response.ok) {
        // Assuming the API returns a success message or the deleted customer's ID
        // You can adjust based on your API's actual response
        setHappyCustomers((prevCustomers) =>
          prevCustomers.filter((cust) => cust._id !== customerId)
        );
      } else {
        const errorData = await response.json();
        console.error('Failed to delete placement:', errorData.message);
        setDeleteError(errorData.message || 'Failed to delete placement.');
      }
    } catch (error) {
      console.error('Error deleting placement:', error);
      setDeleteError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!happyCustomers.length) return <div>Loading happy customers...</div>;

  return (
    <div className={`${styles.main}`}>
      <div className={styles.slider}>
        {happyCustomers.map((customer) =>{
        return   (
          <div className={styles.slide} key={customer._id}>
            <Image
              src={`${baseImageUrl}/${customer.photo}`}
              alt={`${customer.name}'s photo`}
              width={500}
              height={500}
              className={styles.image}
            />
            <div className={styles.details}>
              <div className={styles.circle}>{customer.globalDisplayOrder}</div>
              <span className={styles.name}>{customer.name}</span>
            </div>
            {/* Edit Button */}
            <Button
              fullWidth
              variant='contained'
              color='primary'
              onClick={() => handleEditClick(customer)} >
              {isLoading ? <CircularProgress size={20} /> : 'Edit'}
            </Button>
            {/* Delete Placement Button */}
            <Button
              fullWidth

              variant="contained"
              color="error"
              sx={{ marginTop: '10px' }}
              onClick={() => handleDeletePlacement(customer._id)}
              className={styles.deleteButton}
              disabled={isDeleting} // Disable button while deleting
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
            {deleteError && (
              <div className={styles.errorMessage}>
                {deleteError}
              </div>
            )}
          </div>
        )}
        )}
      </div>

      {/* Edit Customer Dialog */}
      {selectedCustomer && (
        <EditCustomerDialog
          open={isDialogOpen}
          onClose={handleCancel}
          customer={selectedCustomer}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
