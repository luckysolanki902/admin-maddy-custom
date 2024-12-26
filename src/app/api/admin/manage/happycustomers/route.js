//route.js 
// File: pages/api/admin/manage/happycustomers.js

import { connectToDatabase } from '@/lib/db';
import HappyCustomer from '@/models/HappyCustomer';
import SpecificCategory from '@/models/SpecificCategory';

export async function GET(req) {
  await connectToDatabase();

  try {
    const { searchParams } = new URL(req.url);
    const idd = searchParams.get('parentSpecificCategoryId');

    let happyCustomers;

    if (idd) {
      // Filter customers whose placements array has an entry for the given idd
      happyCustomers = await HappyCustomer.find({
        'placements.refId': idd,
      })
        .populate('placements.refId', 'name') // Populate the name of SpecificCategory
        .exec();
    } 
    else {
      // Return only those customers whoose showOnHomepage is true customers if idd is null
      
      happyCustomers = await HappyCustomer.find({
        'showOnHomepage':true,
      })
        .populate('placements.refId', 'name')
        .exec();
    }

    return new Response(JSON.stringify({ happyCustomers }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching happy customers:', error.message);
    return new Response(JSON.stringify({ message: 'Error fetching happy customers' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}


export async function POST(req) {
  await connectToDatabase();

  const data = await req.json();

  try {
    if (data._id) {
      // Update existing happy customer
      const updateData = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.globalDisplayOrder !== undefined) updateData.globalDisplayOrder = data.globalDisplayOrder;

      const updatedCustomer = await HappyCustomer.findByIdAndUpdate(data._id, updateData, { new: true, runValidators: true })
        .populate('placements.refId', 'name')
        .exec();
      
      if (!updatedCustomer) {
        return new Response(JSON.stringify({ message: 'Customer not found' }), { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }

      return new Response(JSON.stringify(updatedCustomer), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Add a new happy customer
    const newCustomer = await HappyCustomer.create(data);
    return new Response(JSON.stringify(newCustomer), { 
      status: 201, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error('Error adding/updating happy customer:', error.message);
    return new Response(JSON.stringify({ message: 'Error adding/updating happy customer' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}

export async function DELETE(req) {
  await connectToDatabase();

  try {
    const { customerId, parentSpecificCategoryId } = await req.json();
    // console.log(customerId,parentSpecificCategoryId)
   
    if (!customerId) {
      return new Response(JSON.stringify({ message: 'Missing customerId or parentSpecificCategoryId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const customer = await HappyCustomer.findById(customerId);

    if (!customer) {
      return new Response(JSON.stringify({ message: 'Customer not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // added for home page issues
    if(!parentSpecificCategoryId && customer.showOnHomepage)
      {customer.showOnHomepage=false;
       await customer.save();
       return new Response(JSON.stringify({ message: 'Placement deleted successfully', customer }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });}
    // console.log(customer.placements, customer.placements.length)
    // Filter out the placement corresponding to the specific category
    const updatedPlacements = customer.placements.filter(
      (placement) => placement.refId.toString() !== parentSpecificCategoryId
    );
    console.log(customer.placements)

    if (updatedPlacements.length === customer.placements.length) {
      return new Response(JSON.stringify({ message: 'Placement not found for the specified category' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    customer.placements = updatedPlacements;
    await customer.save();

    // Populate placements.refId for consistency
    await customer.populate('placements.refId', 'name');

    return new Response(JSON.stringify({ message: 'Placement deleted successfully', customer }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting placement:', error.message);
    return new Response(JSON.stringify({ message: 'Error deleting placement', error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PATCH(req) {
  await connectToDatabase();

  try {
    const { _id, name, globalDisplayOrder } = await req.json();

    if (!_id) {
      return new Response(JSON.stringify({ message: 'Missing customer ID (_id)' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (globalDisplayOrder !== undefined) updateData.globalDisplayOrder = globalDisplayOrder;

    if (Object.keys(updateData).length === 0) {
      return new Response(JSON.stringify({ message: 'No valid fields to update' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const updatedCustomer = await HappyCustomer.findByIdAndUpdate(_id, updateData, { new: true, runValidators: true })
      .populate('placements.refId', 'name')
      .exec();

    if (!updatedCustomer) {
      return new Response(JSON.stringify({ message: 'Customer not found' }), { 
        status: 404, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify(updatedCustomer), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error('Error updating happy customer:', error.message);
    return new Response(JSON.stringify({ message: 'Error updating happy customer', error: error.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}