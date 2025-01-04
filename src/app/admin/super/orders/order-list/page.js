// page for admin
import OrderListFull from '@/components/full-page-comps/OrderListFull'
import React from 'react'

const page = () => {
  return (
    <div>
      <OrderListFull isAdmin={true}/>
    </div>
  )
}

export default page