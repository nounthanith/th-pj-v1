# API Kit (Next.js App Router + Mongoose)

Copy into your project:

| From                           | To                                    |
|--------------------------------|---------------------------------------|
| lib/db.ts                      | src/lib/db.ts                         |
| lib/api-handler.ts             | src/lib/api-handler.ts                |
| lib/crud.ts                    | src/lib/crud.ts                       |
| models/product.model.ts        | src/models/product.model.ts (example) |
| app-api-products/route.ts      | src/app/api/products/route.ts         |
| app-api-products/[id]/route.ts | src/app/api/products/[id]/route.ts    |
| app-api-custom/route.ts        | example of a custom API               |

.env.local:  MONGODB_URI=mongodb+srv://...
Install:     npm i mongoose

New API in 2 steps: write the model, then 2 route files with createCrud(Model).

Response shape:
  success: { success: true, data, meta? }
  error:   { success: false, message }

Endpoints you get for free:
  GET    /api/products?page=1&limit=10&search=cake&sort=-price&status=active
  POST   /api/products
  GET    /api/products/:id
  PUT    /api/products/:id   (PATCH too)
  DELETE /api/products/:id

Protect a route:
  createCrud(Product, {
    guard: async (req, action) => {
      if (action !== "list" && action !== "get") {
        const session = await auth();            // your auth (NextAuth / Clerk)
        if (!session) throw ApiError.unauthorized();
      }
    },
  });