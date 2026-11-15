# Models and CRUD API Example

```typescript
// src/models/product.model.ts
import mongoose, { Schema, InferSchemaType } from "mongoose";

const ProductSchema = new Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true },
    price: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["active", "hidden"], default: "active" },
  },
  { timestamps: true },
);

export type Product = InferSchemaType<typeof ProductSchema>;

// avoid "OverwriteModelError" on hot reload
export default mongoose.models.Product ||
  mongoose.model("Product", ProductSchema);
```

```typescript
// src/app/api/products/[id]/route.ts
import { createCrud } from "@/lib/crud";
import Product from "@/models/product.model";

const crud = createCrud(Product);

export const GET = crud.getOne;
export const PUT = crud.update;
export const PATCH = crud.update;
export const DELETE = crud.remove;
```

```typescript
// src/app/api/products/route.ts   (full list + create in a few lines)
import { createCrud } from "@/lib/crud";
import Product from "@/models/product.model";

const crud = createCrud(Product, {
  searchFields: ["name"],
  filterFields: ["status"],
});

export const GET = crud.list;
export const POST = crud.create;
```

```typescript
// src/app/api/orders/route.ts   (custom API with the same wrapper)
import {
  ApiError,
  created,
  getBody,
  handler,
  requireFields,
} from "@/lib/api-handler";
import Order from "@/models/order.model"; // your own model

// GET /api/orders?status=pending
export const GET = handler(async (req) => {
  const status = req.nextUrl.searchParams.get("status");
  const orders = await Order.find(status ? { status } : {})
    .sort("-createdAt")
    .lean();
  return orders; // plain value -> { success: true, data: orders }
});

// POST /api/orders
export const POST = handler(async (req) => {
  const body = await getBody(req);
  requireFields(body, ["customerName", "items"]);

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw ApiError.badRequest("Items cannot be empty");
  }

  const order = await Order.create(body);
  return created(order); // 201
});
```
