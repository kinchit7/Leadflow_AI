---
name: data-operations
description: Database and CMS operations with BaseCrudService. Use when working with data, CMS collections, creating list pages, detail pages, pagination, or any CRUD operations.
---

# Data Operations

This skill contains all patterns for working with the Wix CMS, BaseCrudService, and building data-driven pages.

---

## BaseCrudService Import

```typescript
import { BaseCrudService } from '@/integrations';
```

---

## CRITICAL: Parameter Order

**ALWAYS put collection-id FIRST, then item-id SECOND**

```typescript
// ✅ CORRECT
BaseCrudService.getById('collection-id', 'item-id');
BaseCrudService.update('collection-id', { _id: 'item-id', title: 'Updated' });
BaseCrudService.delete('collection-id', 'item-id');

// ❌ WRONG - will fail silently or return wrong data
BaseCrudService.getById('item-id', 'collection-id');
```

---

## CRUD Operations

### Create

```typescript
await BaseCrudService.create('collection-id', { 
  title: 'New Item', 
  description: 'Item description',
  id: crypto.randomUUID() 
});
```

### Read All (Paginated)

```typescript
// Basic usage
const result = await BaseCrudService.getAll<EntityType>('collection-id');

// With custom page size
const result = await BaseCrudService.getAll<EntityType>('collection-id', [], { 
  limit: 20 
});

// With pagination offset
const result = await BaseCrudService.getAll<EntityType>('collection-id', [], { 
  limit: 20,
  skip: 40  // Skip first 40 items
});

// With references
const result = await BaseCrudService.getAll<EntityType>('collection-id', {
  singleRef: ['author', 'category'],
  multiRef: ['tags', 'relatedItems']
}, { limit: 20 });
```

### Result Shape

```typescript
interface PaginatedResult<T> {
  items: T[];           // Items for current page
  totalCount: number;   // Total items in collection
  hasNext: boolean;     // More items exist?
  currentPage: number;  // Current page (0-indexed)
  pageSize: number;     // Items per page
  nextSkip: number | null; // Offset for next page (null if no more)
}
```

### Read By ID

```typescript
// Basic
const item = await BaseCrudService.getById<EntityType>('collection-id', 'item-id');

// With single references (one-to-one relationships)
const item = await BaseCrudService.getById<EntityType>(
  'collection-id', 
  'item-id',
  { singleRef: ['author', 'category'] }
);

// With multi references (one-to-many relationships)
const item = await BaseCrudService.getById<EntityType>(
  'collection-id', 
  'item-id',
  { singleRef: ['author'], multiRef: ['tags', 'comments'] }
);
```

### Update

```typescript
// Only include fields to update - others are preserved automatically
await BaseCrudService.update<EntityType>('collection-id', { 
  _id: 'item-id', 
  title: 'Updated Title',
  description: 'Updated description'
});
```

### Delete

```typescript
await BaseCrudService.delete('collection-id', 'item-id');
```

---

## References

### Add Multi-References

```typescript
// Add tags to an item
await BaseCrudService.addReferences('collection-id', 'item-id', { 
  tags: ['tag-id-1', 'tag-id-2'] 
});

// Add multiple reference types
await BaseCrudService.addReferences('posts', 'post-id', { 
  tags: ['tag-1', 'tag-2'],
  categories: ['cat-1']
});
```

### Remove Multi-References

```typescript
await BaseCrudService.removeReferences('collection-id', 'item-id', { 
  tags: ['tag-id-1'] 
});
```

### Always Check References Exist

```typescript
// Before using reference data, check it exists
if (item.tags?.length > 0) {
  item.tags.map(tag => /* use tag */);
}

if (item.author?.name) {
  // Use author data
}
```

---

## Optimistic Updates

**ALWAYS prefer optimistic updates for CRUD actions (create, update, delete, addReferences, removeReferences).**

Update UI state immediately BEFORE the API call for a responsive experience. On failure, reload data to sync with server.

### Pattern

```typescript
// Step 1: Update UI immediately
setItems(prev => [...prev, newItem]);

// Step 2: Make API call
try {
  await BaseCrudService.create('collection-id', newItem);
} catch {
  // Step 3: Revert on failure
  loadData();
}
```

### Create with Optimistic Update

```typescript
const handleCreate = async (newItem: EntityType) => {
  // Optimistically add to UI
  const tempItem = { ...newItem, _id: crypto.randomUUID() };
  setItems(prev => [tempItem, ...prev]);
  
  try {
    await BaseCrudService.create('collection-id', tempItem);
  } catch {
    // Revert on failure
    loadData();
  }
};
```

### Update with Optimistic Update

```typescript
const handleUpdate = async (itemId: string, updates: Partial<EntityType>) => {
  // Optimistically update UI
  setItems(prev => prev.map(item => 
    item._id === itemId ? { ...item, ...updates } : item
  ));
  
  try {
    await BaseCrudService.update('collection-id', { _id: itemId, ...updates });
  } catch {
    loadData();
  }
};
```

### Delete with Optimistic Update

```typescript
const handleDelete = async (itemId: string) => {
  // Optimistically remove from UI
  setItems(prev => prev.filter(item => item._id !== itemId));
  
  try {
    await BaseCrudService.delete('collection-id', itemId);
  } catch {
    loadData();
  }
};
```

### When to Use Loading States Instead

Use loading states only for:
- Initial page load
- Pagination / Load More
- Data fetching that doesn't modify existing data

---

## List Pages

### Required Elements

For pages using `getAll()`, you MUST include:

1. **NO loading spinners** - content animates in when ready (use Framer Motion)
2. **Reserve vertical space** on content wrapper to prevent layout shift
3. **Pagination state** - track `hasNext`, `skip`/`nextSkip` from result
4. **Load More UI** - button, infinite scroll, or page controls when `hasNext` is true
5. **Error handling** - wrap fetch in try/catch

### Complete List Page Pattern

```typescript
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BaseCrudService } from '@/integrations';
import { Button } from '@/components/ui/button';

type Item = {
  _id: string;
  title: string;
  description: string;
};

const PAGE_SIZE = 12;

const ListPage = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [nextSkip, setNextSkip] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadData = async (skip = 0, append = false) => {
    if (skip > 0) setIsLoadingMore(true);
    
    try {
      const result = await BaseCrudService.getAll<Item>('items', [], { 
        limit: PAGE_SIZE,
        skip 
      });
      
      if (append) {
        setItems(prev => [...prev, ...result.items]);
      } else {
        setItems(result.items);
      }
      
      setHasNext(result.hasNext);
      setNextSkip(result.nextSkip);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLoadMore = () => {
    if (nextSkip !== null) {
      loadData(nextSkip, true);
    }
  };

  return (
    <div className="max-w-[100rem] mx-auto px-4 py-16">
      <h1 className="font-heading text-4xl mb-8">Items</h1>
      
      {/* Reserve vertical space to prevent layout shift */}
      <div className="min-h-[400px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, index) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border rounded-lg p-6"
            >
              <h3 className="font-heading text-xl mb-2">{item.title}</h3>
              <p className="font-paragraph text-muted-foreground">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Load More */}
      {hasNext && (
        <div className="flex justify-center mt-8">
          <Button 
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            variant="outline"
          >
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ListPage;
```

### Infinite Scroll Pattern

```typescript
import { useEffect, useRef, useCallback } from 'react';

const ListPage = () => {
  // ... state from above
  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasNext && !isLoadingMore && nextSkip !== null) {
      loadData(nextSkip, true);
    }
  }, [hasNext, isLoadingMore, nextSkip]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(handleObserver, {
      rootMargin: '100px',
    });
    
    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }
    
    return () => observerRef.current?.disconnect();
  }, [handleObserver]);

  return (
    <div>
      {/* ... items grid */}
      
      {/* Invisible trigger for infinite scroll */}
      {hasNext && <div ref={loadMoreRef} className="h-1" />}
    </div>
  );
};
```

---

## Detail Pages

### Required Elements

For pages using `getById()`:

1. **Error handling** - wrap fetch in try/catch
2. **Loading states** - show appropriate UI while fetching
3. **Not found handling** - handle missing items gracefully

### Complete Detail Page Pattern

```typescript
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BaseCrudService } from '@/integrations';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

type Item = {
  _id: string;
  title: string;
  description: string;
  content: string;
  image: string;
  author?: { name: string; avatar: string };
};

const DetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadItem = async () => {
      if (!id) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }
      
      try {
        const data = await BaseCrudService.getById<Item>(
          'items', 
          id,
          { singleRef: ['author'] }
        );
        
        if (!data) {
          setNotFound(true);
        } else {
          setItem(data);
        }
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadItem();
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-[100rem] mx-auto px-4 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="max-w-[100rem] mx-auto px-4 py-16 text-center">
        <h1 className="font-heading text-4xl mb-4">Not Found</h1>
        <p className="font-paragraph text-muted-foreground mb-8">
          The item you're looking for doesn't exist.
        </p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-[100rem] mx-auto px-4 py-16"
    >
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)}
        className="mb-8"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
      
      <article>
        <h1 className="font-heading text-4xl md:text-5xl mb-6">{item.title}</h1>
        
        {item.author && (
          <div className="flex items-center gap-3 mb-8">
            <Image 
              src={item.author.avatar} 
              alt={item.author.name}
              width={40}
              className="rounded-full"
            />
            <span className="font-paragraph">{item.author.name}</span>
          </div>
        )}
        
        {item.image && (
          <div className="aspect-video relative mb-8 rounded-lg overflow-hidden">
            <Image 
              src={item.image} 
              alt={item.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="prose max-w-none">
          <p className="font-paragraph text-lg">{item.description}</p>
          <div className="font-paragraph mt-8">{item.content}</div>
        </div>
      </article>
    </motion.div>
  );
};

export default DetailPage;
```

---

## CMS Workflow

### What You CAN Do

- Create new CMS collections
- Add items to collections
- Add columns/fields to collections
- Make collections sellable (add catalog/ecommerce)

### What You CANNOT Do

- Modify/delete EXISTING items, their values (images, titles), or fields

### For Editing Existing CMS Data

Direct user to: `https://manage.wix.com/dashboard/{siteId}/database`

### Decision Logic

1. **Always use cmsDeciderServiceAgent first** for content that could be managed dynamically
2. **Creating collections** → Agent required (UI usually needed)
3. **Adding fields** → Agent NOT needed (data auto-added)
4. **Adding items only** → Agent NOT needed (UI renders automatically)
5. **Making collection sellable** → Agent REQUIRED (must implement cart/buyNow UI)

### When Uncertain About UI Needs

If you're unsure whether the user wants UI components created or just data management, ask for clarification.

**Important**: Complete ALL tasks you CAN do first, then mention the CMS link in your FINAL response for unsupported parts.

---

## Entities

### Critical Rules

- The ONLY CMS collections that exist are defined in `src/entities/index.ts`
- Do NOT assume or hallucinate collections that are not in this file
- Do NOT create new entity files or types - they are auto-generated
- Do NOT edit ANY file in the `src/entities/` folder
- If a collection is not in index.ts, it DOES NOT EXIST

### Checking Available Collections

Before using any collection, verify it exists:

```typescript
import { CollectionIds } from '@/services';

// Use the collection IDs defined in the entities
const result = await BaseCrudService.getAll<EntityType>(CollectionIds.ITEMS);
```
