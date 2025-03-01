// app/api/admin/manage/update-inventory/route.js
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Product from "@/models/Product";
import Option from "@/models/Option";
import Inventory from "@/models/Inventory";

export async function POST(request) {
  try {
    await connectToDatabase();
    // Expecting a JSON payload: { updates: [{ sku, availableQuantity, reorderLevel }, ...] }
    const { updates } = await request.json();
    const results = [];

    for (const update of updates) {
      const { sku, availableQuantity, reorderLevel } = update;
      let result = { sku, status: "", message: "" };

      // Try to find a product with this SKU
      let product = await Product.findOne({ sku });
      if (product) {
        // Product found—update its inventory
        if (product.inventoryData) {
          // Update the existing inventory document
          let inventory = await Inventory.findById(product.inventoryData);
          if (inventory) {
            inventory.availableQuantity += parseInt(availableQuantity);
            if (reorderLevel !== null && reorderLevel !== undefined) {
              inventory.reorderLevel = parseInt(reorderLevel);
            }
            await inventory.save();
            result.status = "Updated";
            result.message = "Product inventory updated";
          } else {
            // Inventory reference exists but document is missing; create a new one
            const newInventory = new Inventory({
              availableQuantity: parseInt(availableQuantity),
              reorderLevel:
                reorderLevel !== null && reorderLevel !== undefined
                  ? parseInt(reorderLevel)
                  : 50,
            });
            await newInventory.save();
            product.inventoryData = newInventory._id;
            await product.save();
            result.status = "Created";
            result.message = "New inventory created for product";
          }
        } else {
          // No inventoryData on the product; create and assign a new record
          const newInventory = new Inventory({
            availableQuantity: parseInt(availableQuantity),
            reorderLevel:
              reorderLevel !== null && reorderLevel !== undefined
                ? parseInt(reorderLevel)
                : 50,
          });
          await newInventory.save();
          product.inventoryData = newInventory._id;
          await product.save();
          result.status = "Created";
          result.message = "New inventory created and assigned to product";
        }
      } else {
        // No matching product; check in the Option model
        let option = await Option.findOne({ sku });
        if (option) {
          if (option.inventoryData) {
            let inventory = await Inventory.findById(option.inventoryData);
            if (inventory) {
              inventory.availableQuantity += parseInt(availableQuantity);
              if (reorderLevel !== null && reorderLevel !== undefined) {
                inventory.reorderLevel = parseInt(reorderLevel);
              }
              await inventory.save();
              result.status = "Updated";
              result.message = "Option inventory updated";
            } else {
              const newInventory = new Inventory({
                availableQuantity: parseInt(availableQuantity),
                reorderLevel:
                  reorderLevel !== null && reorderLevel !== undefined
                    ? parseInt(reorderLevel)
                    : 50,
              });
              await newInventory.save();
              option.inventoryData = newInventory._id;
              await option.save();
              result.status = "Created";
              result.message = "New inventory created for option";
            }
          } else {
            const newInventory = new Inventory({
              availableQuantity: parseInt(availableQuantity),
              reorderLevel:
                reorderLevel !== null && reorderLevel !== undefined
                  ? parseInt(reorderLevel)
                  : 50,
            });
            await newInventory.save();
            option.inventoryData = newInventory._id;
            await option.save();
            result.status = "Created";
            result.message = "New inventory created and assigned to option";
          }
        } else {
          // Neither a product nor an option with the given SKU was found.
          // Create an "orphan" inventory record for reference.
          const newInventory = new Inventory({
            availableQuantity: parseInt(availableQuantity),
            reorderLevel:
              reorderLevel !== null && reorderLevel !== undefined
                ? parseInt(reorderLevel)
                : 50,
          });
          await newInventory.save();
          result.status = "Created";
          result.message = "New inventory created for unknown SKU";
        }
      }
      results.push(result);
    }

    return NextResponse.json({
      summary: { processed: updates.length },
      details: results,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Bulk update failed." },
      { status: 500 }
    );
  }
}
