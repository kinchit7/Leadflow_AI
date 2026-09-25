---
name: image-work
description: Image handling and media galleries. Use when adding images, creating galleries, working with media, or handling image placeholders.
---

# Image Work

This skill contains all patterns for working with images, media galleries, and the image placeholder system.

---

## Core Rule

**Always use the `Image` component from `@/components/ui/image`**

```typescript
import { Image } from '@/components/ui/image';

<Image 
  src="image-url" 
  alt="Description of image" 
  width={800} 
/>
```

This component is **guaranteed to exist** - do NOT create fallback definitions or import from other sources.

---

## Image Sources

### 1. User-Provided URLs

When user provides a specific image URL, use it as-is:

```typescript
<Image src={userProvidedUrl} alt="User provided image" width={600} />
```

### 2. CMS / External Source URLs

When image URL is fetched from CMS or any other external source, use the real URL from the data:

```typescript
// From CMS data
<Image src={item.imageUrl} alt={item.title} width={800} />

// From API response
<Image src={apiData.coverImage} alt={apiData.name} width={600} />
```

### 3. Placeholder Images (for Post-Processing)

When no image URL is available, use the placeholder URL with a unique ID:

```typescript
const IMAGE_PLACEHOLDER = "https://static.wixstatic.com/media/12d367_71ebdd7141d041e4be3d91d80d4578dd~mv2.png";

// Use with unique ID
<Image 
  src={`${IMAGE_PLACEHOLDER}?id=hero-main`} 
  alt="Hero background" 
  width={1920} 
/>
```

---

## Placeholder Format

### URL Structure

```
https://static.wixstatic.com/media/12d367_71ebdd7141d041e4be3d91d80d4578dd~mv2.png?id=<unique-identifier>
```

### Requirements

1. **Each image must have a unique ID** in the query string
2. Use descriptive IDs: `hero-image`, `team-member-1`, `gallery-item-3`
3. IDs must match regex pattern: `\w+(-\w+)*`

### Examples

```typescript
// Good IDs
`${IMAGE_PLACEHOLDER}?id=hero-background`
`${IMAGE_PLACEHOLDER}?id=about-section-image`
`${IMAGE_PLACEHOLDER}?id=team-member-john`
`${IMAGE_PLACEHOLDER}?id=product-thumbnail-1`

// Bad IDs (won't work with post-processing)
`${IMAGE_PLACEHOLDER}?id=hero background`  // spaces
`${IMAGE_PLACEHOLDER}?id=image#1`          // special chars
`${IMAGE_PLACEHOLDER}`                      // missing ID
```

---

## Lists with Images

### Critical Rule

**Put placeholder URLs in the data array, NOT in the JSX loop.**

The post-processing system looks for placeholder URLs in the source code. If you generate them dynamically in a loop, they won't be found.

### Correct Pattern

```typescript
const IMAGE_PLACEHOLDER = "https://static.wixstatic.com/media/12d367_71ebdd7141d041e4be3d91d80d4578dd~mv2.png";

// Define data with placeholder URLs embedded
const teamMembers = [
  { 
    name: "John Smith", 
    role: "CEO",
    image: `${IMAGE_PLACEHOLDER}?id=team-john` 
  },
  { 
    name: "Jane Doe", 
    role: "CTO",
    image: `${IMAGE_PLACEHOLDER}?id=team-jane` 
  },
  { 
    name: "Bob Wilson", 
    role: "Designer",
    image: `${IMAGE_PLACEHOLDER}?id=team-bob` 
  },
];

// Render the list
{teamMembers.map(member => (
  <div key={member.name} className="text-center">
    <Image 
      src={member.image} 
      alt={member.name} 
      width={200}
      className="rounded-full mx-auto mb-4"
    />
    <h3 className="font-heading text-lg">{member.name}</h3>
    <p className="font-paragraph text-muted-foreground">{member.role}</p>
  </div>
))}
```

### Wrong Pattern

```typescript
// ❌ DON'T generate placeholder URLs in the loop
const teamMembers = [
  { name: "John Smith", role: "CEO" },
  { name: "Jane Doe", role: "CTO" },
];

{teamMembers.map((member, index) => (
  <Image 
    // This won't work! Post-processor can't find these
    src={`${IMAGE_PLACEHOLDER}?id=team-${index}`} 
    alt={member.name}
  />
))}
```

---

## Gallery Patterns

### Grid Gallery

```typescript
const IMAGE_PLACEHOLDER = "https://static.wixstatic.com/media/12d367_71ebdd7141d041e4be3d91d80d4578dd~mv2.png";

const galleryImages = [
  { id: "gallery-1", alt: "Gallery image 1", src: `${IMAGE_PLACEHOLDER}?id=gallery-1` },
  { id: "gallery-2", alt: "Gallery image 2", src: `${IMAGE_PLACEHOLDER}?id=gallery-2` },
  { id: "gallery-3", alt: "Gallery image 3", src: `${IMAGE_PLACEHOLDER}?id=gallery-3` },
  { id: "gallery-4", alt: "Gallery image 4", src: `${IMAGE_PLACEHOLDER}?id=gallery-4` },
  { id: "gallery-5", alt: "Gallery image 5", src: `${IMAGE_PLACEHOLDER}?id=gallery-5` },
  { id: "gallery-6", alt: "Gallery image 6", src: `${IMAGE_PLACEHOLDER}?id=gallery-6` },
];

const Gallery = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
    {galleryImages.map(img => (
      <div key={img.id} className="aspect-square relative overflow-hidden rounded-lg">
        <Image 
          src={img.src} 
          alt={img.alt}
          className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
      </div>
    ))}
  </div>
);
```

### Masonry Gallery

```typescript
const MasonryGallery = () => (
  <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
    {galleryImages.map(img => (
      <div key={img.id} className="mb-4 break-inside-avoid">
        <Image 
          src={img.src} 
          alt={img.alt}
          className="w-full rounded-lg"
        />
      </div>
    ))}
  </div>
);
```

### Featured Image with Grid

```typescript
const IMAGE_PLACEHOLDER = "https://static.wixstatic.com/media/12d367_71ebdd7141d041e4be3d91d80d4578dd~mv2.png";

const FeaturedGallery = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Large featured image */}
    <div className="md:row-span-2 aspect-square md:aspect-auto relative rounded-lg overflow-hidden">
      <Image 
        src={`${IMAGE_PLACEHOLDER}?id=gallery-featured`}
        alt="Featured image"
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
    
    {/* Smaller images */}
    <div className="aspect-video relative rounded-lg overflow-hidden">
      <Image 
        src={`${IMAGE_PLACEHOLDER}?id=gallery-small-1`}
        alt="Gallery image 1"
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
    <div className="aspect-video relative rounded-lg overflow-hidden">
      <Image 
        src={`${IMAGE_PLACEHOLDER}?id=gallery-small-2`}
        alt="Gallery image 2"
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  </div>
);
```

---

## Accessibility

### Alt Text Requirements

**All images MUST have an `alt` attribute with a meaningful description.**

```typescript
// ✅ Good - descriptive alt text
<Image src={url} alt="Chef preparing fresh pasta in a modern kitchen" />
<Image src={url} alt="Team meeting in the conference room" />
<Image src={url} alt="Product packaging showing brand logo and ingredients" />

// ❌ Bad - non-descriptive
<Image src={url} alt="image" />
<Image src={url} alt="photo" />
<Image src={url} alt="" />
<Image src={url} alt="img1" />
```

### Decorative Images

For purely decorative images, use an empty alt with aria-hidden:

```typescript
<Image 
  src={decorativePattern} 
  alt="" 
  aria-hidden="true"
  className="absolute inset-0 opacity-10"
/>
```

---

## Width Specification

**Provide width in pixels when possible** for better performance:

```typescript
// With explicit width
<Image src={url} alt="Product" width={600} />

// For full-width images
<Image src={url} alt="Hero" width={1920} className="w-full" />

// For thumbnails
<Image src={url} alt="Thumb" width={150} />
```

---

## Common Patterns

### Hero Image

```typescript
const IMAGE_PLACEHOLDER = "https://static.wixstatic.com/media/12d367_71ebdd7141d041e4be3d91d80d4578dd~mv2.png";

<section className="relative min-h-[80vh]">
  <div className="absolute inset-0">
    <Image 
      src={`${IMAGE_PLACEHOLDER}?id=hero-background`}
      alt="Beautiful landscape background"
      width={1920}
      className="w-full h-full object-cover"
    />
    <div className="absolute inset-0 bg-black/40" />
  </div>
  <div className="relative z-10">
    {/* Content */}
  </div>
</section>
```

### Profile/Avatar Image

```typescript
<Image 
  src={member.photo || `${IMAGE_PLACEHOLDER}?id=avatar-default`}
  alt={`${member.name}'s profile photo`}
  width={100}
  className="w-24 h-24 rounded-full object-cover"
/>
```

### Card Image

```typescript
<div className="rounded-lg overflow-hidden border">
  <div className="aspect-video relative">
    <Image 
      src={item.image}
      alt={item.title}
      width={600}
      className="absolute inset-0 w-full h-full object-cover"
    />
  </div>
  <div className="p-4">
    <h3 className="font-heading text-lg">{item.title}</h3>
  </div>
</div>
```

### Background Image

```typescript
<section 
  className="relative py-24"
  style={{ backgroundColor: 'var(--muted)' }}
>
  <div className="absolute inset-0 opacity-20">
    <Image 
      src={`${IMAGE_PLACEHOLDER}?id=section-pattern`}
      alt=""
      aria-hidden="true"
      className="w-full h-full object-cover"
    />
  </div>
  <div className="relative z-10 max-w-[100rem] mx-auto px-4">
    {/* Content */}
  </div>
</section>
```

---

## Prohibited Sources

**Do NOT use:**

- ❌ Unsplash
- ❌ Pexels  
- ❌ Pixabay
- ❌ Any other external image sources
- ❌ Lorem Picsum
- ❌ Placeholder.com

**Only use:**

- ✅ User-provided URLs
- ✅ CMS image URLs
- ✅ The Wix placeholder URL (for post-processing)

---

## Image Loading Best Practices

### Lazy Loading

Images below the fold should use lazy loading (handled automatically by the Image component in most cases):

```typescript
<Image 
  src={url} 
  alt="Below fold content"
  loading="lazy"
/>
```

### Priority Images

For hero/above-fold images that should load immediately:

```typescript
<Image 
  src={heroImage} 
  alt="Hero"
  loading="eager"
  fetchPriority="high"
/>
```

---

## Aspect Ratios

Use aspect ratio utilities for consistent image containers:

```typescript
// Square
<div className="aspect-square relative">
  <Image src={url} alt="..." className="absolute inset-0 w-full h-full object-cover" />
</div>

// Video (16:9)
<div className="aspect-video relative">
  <Image src={url} alt="..." className="absolute inset-0 w-full h-full object-cover" />
</div>

// Portrait (3:4)
<div className="aspect-[3/4] relative">
  <Image src={url} alt="..." className="absolute inset-0 w-full h-full object-cover" />
</div>

// Custom aspect ratio
<div className="aspect-[21/9] relative">
  <Image src={url} alt="..." className="absolute inset-0 w-full h-full object-cover" />
</div>
```
