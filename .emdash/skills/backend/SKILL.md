---
name: backend
description: Astro server-side API routes and backend endpoints. Use when creating API endpoints, server routes, handling form submissions server-side, building REST APIs, or any backend logic that runs on the server under src/pages/.
---

# Backend API Routes

This app runs Astro with `output: "server"` (full SSR). All files in `src/pages/` are server-rendered by default -- no need to opt out of prerendering. API routes are `.ts` files in `src/pages/` that export HTTP method handlers.

---

## File Location and Routing

API routes live in `src/pages/` and the file path determines the URL:

```
src/pages/api/hello.ts        → GET /api/hello
src/pages/api/users.ts        → GET/POST /api/users
src/pages/api/users/[id].ts   → GET/PUT/DELETE /api/users/:id
src/pages/api/data.json.ts    → GET /api/data.json
```

Convention: place all API routes under `src/pages/api/` to keep them separate from the catch-all `[...slug].astro` page.

---

## Basic Endpoint

Every endpoint exports named functions for HTTP methods (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `ALL`). Each receives an Astro context object and must return a `Response`.

```typescript
// src/pages/api/hello.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ params, request }) => {
  return new Response(
    JSON.stringify({ message: 'Hello from the API' }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
```

---

## Context Object

Every handler receives the full Astro context:

```typescript
export const POST: APIRoute = async ({ params, request, cookies, redirect, url }) => {
  // request  - standard Web Request object (headers, body, method, url)
  // params   - dynamic route parameters (e.g., { id: '123' })
  // cookies  - read/set cookies
  // redirect - server-side redirect helper
  // url      - parsed URL object

  const body = await request.json();
  // ...
};
```

---

## HTTP Methods

Export one function per method. Use `ALL` as a catch-all for unhandled methods.

```typescript
// src/pages/api/items.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  // List items
  const items = await getItems();
  return new Response(JSON.stringify(items), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  // Create item
  const body = await request.json();
  const created = await createItem(body);
  return new Response(JSON.stringify(created), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
```

```typescript
// src/pages/api/items/[id].ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params }) => {
  const item = await getItem(params.id);
  if (!item) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify(item), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const body = await request.json();
  const updated = await updateItem(params.id, body);
  return new Response(JSON.stringify(updated), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  await deleteItem(params.id);
  return new Response(null, { status: 204 });
};
```

---

## Using Wix SDKs in API Routes

Wix SDK packages work in server-side Astro endpoints the same way as in client code. Import and call them directly:

```typescript
// src/pages/api/products.ts
import type { APIRoute } from 'astro';
import { items } from '@wix/data';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const skip = parseInt(url.searchParams.get('skip') || '0');

  const result = await items
    .query('products')
    .skip(skip)
    .limit(limit)
    .find({ returnTotalCount: true });

  return new Response(
    JSON.stringify({
      items: result.items,
      totalCount: result.totalCount,
      hasNext: result.hasNext(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
```

Available Wix SDK packages:

```typescript
import { items } from '@wix/data';           // CMS data operations
import { members } from '@wix/members';       // Member data
import { currentCart, checkout } from '@wix/ecom';  // Ecommerce
import { redirects } from '@wix/redirects';   // Redirect sessions
```

---

## Response Helpers

Always return a standard `Response` object.

### JSON Response

```typescript
return new Response(JSON.stringify(data), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
});
```

### Error Response

```typescript
return new Response(
  JSON.stringify({ error: 'Something went wrong' }),
  {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  }
);
```

### Empty Response (204 No Content)

```typescript
return new Response(null, { status: 204 });
```

### Redirect

```typescript
export const GET: APIRoute = ({ redirect }) => {
  return redirect('/new-location', 307);
};
```

---

## Dynamic Routes

Use brackets in filenames for dynamic segments. Parameters are available on `params`.

```typescript
// src/pages/api/users/[userId]/posts/[postId].ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params }) => {
  const { userId, postId } = params;
  // userId and postId are strings
  const post = await getUserPost(userId, postId);
  return new Response(JSON.stringify(post), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
```

### Catch-all Routes

Use `[...path]` for catch-all segments:

```typescript
// src/pages/api/proxy/[...path].ts
import type { APIRoute } from 'astro';

export const ALL: APIRoute = async ({ params, request }) => {
  const path = params.path; // e.g., "users/123/profile"
  // Forward to external API, etc.
};
```

---

## Reading Request Data

### JSON Body

```typescript
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  // body is the parsed JSON object
};
```

### Form Data

```typescript
export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const name = formData.get('name');
  const email = formData.get('email');
};
```

### Query Parameters

```typescript
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const page = url.searchParams.get('page') || '1';
  const search = url.searchParams.get('q') || '';
};
```

### Headers

```typescript
export const POST: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get('Authorization');
  const contentType = request.headers.get('Content-Type');
};
```

---

## Cookies

```typescript
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies }) => {
  // Read a cookie
  const session = cookies.get('session')?.value;

  // Set a cookie
  cookies.set('session', 'new-value', {
    httpOnly: true,
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day in seconds
  });

  // Delete a cookie
  cookies.delete('session');

  return new Response(null, { status: 200 });
};
```

---

## Existing API Routes

The `@wix/astro` integration with `auth: true` automatically provides these routes (do NOT recreate them):

- `GET /api/auth/login` -- OAuth login flow
- `GET /api/auth/logout` -- Logout
- `GET /api/auth/callback` -- OAuth callback
- `GET /api/auth/logout-callback` -- Logout callback

---

## Complete CRUD Example

```typescript
// src/pages/api/posts.ts
import type { APIRoute } from 'astro';
import { items } from '@wix/data';

const COLLECTION = 'posts';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const skip = parseInt(url.searchParams.get('skip') || '0');

  const result = await items
    .query(COLLECTION)
    .skip(skip)
    .limit(limit)
    .find({ returnTotalCount: true });

  return new Response(
    JSON.stringify({
      items: result.items,
      totalCount: result.totalCount,
      hasNext: result.hasNext(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const created = await items.insert(COLLECTION, body);

  return new Response(JSON.stringify(created), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
```

```typescript
// src/pages/api/posts/[id].ts
import type { APIRoute } from 'astro';
import { items } from '@wix/data';

const COLLECTION = 'posts';

export const GET: APIRoute = async ({ params }) => {
  const result = await items.query(COLLECTION).eq('_id', params.id).find();

  if (result.items.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Post not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(JSON.stringify(result.items[0]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const body = await request.json();
  const current = await items.query(COLLECTION).eq('_id', params.id).find();

  if (current.items.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Post not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const updated = await items.update(COLLECTION, { ...current.items[0], ...body });

  return new Response(JSON.stringify(updated), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  await items.remove(COLLECTION, params.id!);
  return new Response(null, { status: 204 });
};
```

---

## Calling API Routes from Client Code

```typescript
// From a React component
const response = await fetch('/api/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'New Post', content: 'Hello' }),
});
const data = await response.json();
```

---

## Rules

- Place API routes in `src/pages/api/` to avoid conflicts with the SPA catch-all route
- Always set `Content-Type: application/json` header for JSON responses
- Always return a `Response` object from every handler
- Use `import type { APIRoute } from 'astro'` for type safety
- Do NOT recreate auth routes -- they are provided by `@wix/astro`
- Let errors bubble up (per project standards) -- do not wrap in try-catch
- Do NOT create `.astro` files for API routes -- use `.ts` files
