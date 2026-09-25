---
name: design-work
description: Comprehensive design and styling guidelines. Use when making design changes, styling components, creating layouts, improving UI, working on hero sections, or redesigning pages/sections.
---

# Design Work

This skill contains all design, styling, and layout guidelines for creating beautiful, production-grade Wix Vibe websites.

## Core Philosophy

- **Dynamic Layouts**: Design diverse, engaging layouts to prevent visual monotony
- **Challenge Predictability**: Avoid always left-aligning content; explore varied alignments
- **Section Variation**: Consecutive sections MUST use distinctly different structural layouts
- **Generous Media**: Be generous with images throughout the design

---

## Layout Patterns

### Content Containers

Default max-width is `max-w-[100rem]` (~1600px) or more. **NEVER use max-width less than 100rem.**

```jsx
// Standard container
<div className="max-w-[100rem] mx-auto px-4 md:px-8">
  {/* content */}
</div>

// Full-width sections with contained content
<section className="w-full bg-primary">
  <div className="max-w-[100rem] mx-auto px-4 md:px-8 py-16">
    {/* content */}
  </div>
</section>
```

### Responsive Grids

```jsx
// 1 → 2 → 3 column grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// 1 → 2 → 4 column grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

// Asymmetric grid
<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
  <div className="lg:col-span-2">{/* main content */}</div>
  <div>{/* sidebar */}</div>
</div>
```

### Flexbox Patterns

```jsx
// Stack to row
<div className="flex flex-col md:flex-row gap-4">

// Centered content
<div className="flex items-center justify-center min-h-[400px]">

// Space between
<div className="flex items-center justify-between">

// Reverse on mobile
<div className="flex flex-col-reverse md:flex-row gap-8">
```

---

## Section Variation

**CRITICAL**: Consecutive sections MUST use distinctly different structural layouts.

### Avoid
- Repeating the same column structure (e.g., 3-column, 3-column, 3-column)
- Using the same alignment for adjacent sections
- Monotonous, predictable patterns

### Vary With
- Different column counts (2-col, 3-col, 4-col, full-width)
- Different content types (lists, galleries, split-screens, cards)
- Different alignments (left, right, centered, asymmetrical)
- Different background treatments (solid colors, gradients, images)

### Section Pattern Examples

```jsx
// Pattern 1: Full-width hero with centered text
<section className="w-full min-h-[80vh] flex items-center justify-center">

// Pattern 2: Two-column split (image + text)
<section className="grid grid-cols-1 lg:grid-cols-2 gap-0">
  <div className="order-2 lg:order-1">{/* image */}</div>
  <div className="order-1 lg:order-2 p-8 lg:p-16">{/* text */}</div>
</section>

// Pattern 3: Three-column feature cards
<section className="py-24">
  <div className="max-w-[100rem] mx-auto px-4">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

// Pattern 4: Alternating rows
<section className="space-y-16">
  {items.map((item, i) => (
    <div className={`flex flex-col ${i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8`}>
```

---

## Hero Sections

**Goal**: The hero section MUST be exceptionally impressive, captivating, and set a bold visual style for the entire site.

### Requirements

1. **Full-Bleed Layout**: Use `w-full` with `max-w-[120rem]` to fully utilize the screen
2. **Visual Impact**: Create immediate visual impact that captures attention
3. **Bold Typography**: Large, impactful headings that make a statement
4. **Strategic Imagery**: Hero images should be prominent and high-quality

### Hero Patterns

```jsx
// Full-screen hero with overlay
<section className="relative w-full min-h-screen flex items-center justify-center">
  <div className="absolute inset-0">
    <Image src={heroImage} alt="..." className="w-full h-full object-cover" />
    <div className="absolute inset-0 bg-black/40" />
  </div>
  <div className="relative z-10 text-center text-white max-w-4xl px-4">
    <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl mb-6">
      Bold Headline
    </h1>
    <p className="font-paragraph text-lg md:text-xl mb-8 opacity-90">
      Supporting text that elaborates on the headline
    </p>
    <Button size="lg">Call to Action</Button>
  </div>
</section>

// Split hero (text + image)
<section className="w-full min-h-[90vh] grid grid-cols-1 lg:grid-cols-2">
  <div className="flex items-center justify-center p-8 lg:p-16">
    <div className="max-w-xl">
      <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl mb-6">
        Headline
      </h1>
      <p className="font-paragraph text-lg mb-8">Description</p>
      <div className="flex gap-4">
        <Button>Primary CTA</Button>
        <Button variant="outline">Secondary CTA</Button>
      </div>
    </div>
  </div>
  <div className="relative min-h-[400px] lg:min-h-full">
    <Image src={heroImage} alt="..." className="absolute inset-0 w-full h-full object-cover" />
  </div>
</section>
```

### Inspiration Images

If an inspiration image is provided for the Hero Section:
1. Study it thoroughly
2. Analyze its composition, layout structure, and element placement
3. Use it as a **foundation** to create an amazing, innovative layout
4. Adapt it to your specific content and brand requirements

---

## Typography

### Font Classes

- **Headings**: Always use `font-heading` in className
- **Paragraphs**: Always use `font-paragraph` in className

```jsx
<h1 className="font-heading text-4xl md:text-5xl lg:text-6xl">Heading</h1>
<h2 className="font-heading text-3xl md:text-4xl">Subheading</h2>
<h3 className="font-heading text-2xl md:text-3xl">Section Title</h3>

<p className="font-paragraph text-base md:text-lg">Body text</p>
<p className="font-paragraph text-sm">Small text</p>
```

### Responsive Typography

```jsx
// Hero headline
<h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">

// Section headline
<h2 className="font-heading text-2xl md:text-3xl lg:text-4xl">

// Body text
<p className="font-paragraph text-base md:text-lg leading-relaxed">

// Large lead paragraph
<p className="font-paragraph text-lg md:text-xl lg:text-2xl">
```

### Text Alignment

```jsx
// Centered text section
<div className="text-center max-w-3xl mx-auto">
  <h2 className="font-heading text-3xl md:text-4xl mb-4">Title</h2>
  <p className="font-paragraph text-lg">Description</p>
</div>

// Left-aligned with max-width
<div className="max-w-prose">
  <p className="font-paragraph">Long form content...</p>
</div>
```

---

## Buttons

### Consistency Rules

1. Keep `border-radius` consistent across buttons in the same context
2. Keep `height` consistent, especially when buttons are adjacent
3. Use consistent sizing within button groups

### Contrast Verification

**MANDATORY**: Verify TWO contrast points meet WCAG AA standards:

1. **Button label** vs. **button background**
2. **Button background** vs. **container background**

```jsx
// Example: On dark background
<section className="bg-primary">
  {/* Button needs to contrast with primary background */}
  <Button variant="secondary">Action</Button>
</section>

// Example: On light background
<section className="bg-background">
  <Button variant="default">Action</Button>
</section>
```

### Button Groups

```jsx
// Horizontal button group
<div className="flex flex-col sm:flex-row gap-4">
  <Button size="lg">Primary Action</Button>
  <Button size="lg" variant="outline">Secondary Action</Button>
</div>

// Stacked on mobile, inline on desktop
<div className="flex flex-col sm:flex-row gap-3">
  <Button className="w-full sm:w-auto">Action 1</Button>
  <Button className="w-full sm:w-auto" variant="ghost">Action 2</Button>
</div>
```

---

## Header & Footer

### Header

- Create at `/src/components/Header.tsx`
- Include navigation links to all pages
- For single-page sites, use anchor links to sections

```jsx
// Header pattern
<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
  <div className="max-w-[100rem] mx-auto px-4 h-16 flex items-center justify-between">
    <Link to="/" className="font-heading text-xl">Logo</Link>
    <nav className="hidden md:flex items-center gap-6">
      <Link to="/about" className="font-paragraph hover:text-primary">About</Link>
      <Link to="/services" className="font-paragraph hover:text-primary">Services</Link>
      <Link to="/contact" className="font-paragraph hover:text-primary">Contact</Link>
    </nav>
    {/* Mobile menu button */}
  </div>
</header>
```

### Footer

- Create at `/src/components/Footer.tsx`
- **Avoid generic footer layouts** - make it unique to the brand
- Do **NOT** add `margin-top` to the footer to create gap

```jsx
// Footer pattern
<footer className="bg-muted py-16">
  <div className="max-w-[100rem] mx-auto px-4">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
      {/* Logo and description */}
      <div className="md:col-span-2">
        <h3 className="font-heading text-xl mb-4">Brand Name</h3>
        <p className="font-paragraph text-muted-foreground">
          Brief description of the company or site.
        </p>
      </div>
      {/* Navigation links */}
      <div>
        <h4 className="font-heading text-sm uppercase tracking-wider mb-4">Links</h4>
        <nav className="flex flex-col gap-2">
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
        </nav>
      </div>
      {/* Contact info */}
      <div>
        <h4 className="font-heading text-sm uppercase tracking-wider mb-4">Contact</h4>
        <p className="font-paragraph text-sm">email@example.com</p>
      </div>
    </div>
  </div>
</footer>
```

### Navigation & Scroll Control

- Enable smooth scrolling globally
- For sites with 3 or fewer pages, add anchor links to key sections
- Use absolute paths: `/about#contact`, `/#services`

```jsx
// Anchor link
<a href="#services" className="hover:text-primary">Services</a>

// Section with ID
<section id="services" className="py-24">
```

---

## Animations

Use **Framer Motion** for all animations.

### Basic Fade-In

```jsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  Content
</motion.div>
```

### Staggered Children

```jsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

<motion.div variants={containerVariants} initial="hidden" animate="visible">
  {items.map(item => (
    <motion.div key={item.id} variants={itemVariants}>
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

### Scroll-Triggered Animation

```jsx
<motion.div
  initial={{ opacity: 0, y: 50 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-100px" }}
  transition={{ duration: 0.6 }}
>
  Content appears when scrolled into view
</motion.div>
```

### Hover Effects

```jsx
<motion.div
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
>
  Interactive element
</motion.div>
```

---

## Color Usage

### Rules

1. Use colors **strictly** from tailwind.config or user-requested colors
2. Tailwind config tokens use **Kebab-case** (hyphens), NOT camelCase
3. Use a **limited subset** of brand colors throughout the design
4. Avoid too many different colors

### Common Color Tokens

```jsx
// Background colors
className="bg-background"
className="bg-foreground"
className="bg-primary"
className="bg-secondary"
className="bg-muted"
className="bg-accent"
className="bg-card"

// Text colors
className="text-foreground"
className="text-primary"
className="text-muted-foreground"
className="text-primary-foreground"

// Border colors
className="border-border"
className="border-primary"
```

---

## Responsive Design

### Breakpoints

| Prefix | Min-width | Typical Use |
|--------|-----------|-------------|
| (none) | 0px | Mobile-first default |
| `sm:` | 640px | Large phones |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Large screens |

### Common Responsive Patterns

```jsx
// Stack to row
<div className="flex flex-col md:flex-row">

// Hide/show elements
<div className="hidden md:block">{/* desktop only */}</div>
<div className="block md:hidden">{/* mobile only */}</div>

// Responsive padding
<div className="p-4 md:p-8 lg:p-12">

// Responsive gap
<div className="gap-4 md:gap-6 lg:gap-8">

// Responsive text alignment
<div className="text-center md:text-left">
```

---

## Accessibility

### Color Contrast

**MANDATORY**: Check color contrast for ALL UI elements against their backgrounds.

- Text, buttons, icons, forms
- All interactive states: default, hover, active, focus
- If brand book specifies a failing color combination, **correct it**

### Semantic HTML

- Use proper heading hierarchy (h1 → h2 → h3)
- **Only ONE `<h1>` per page**
- Use semantic elements: `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`

### Focus States

```jsx
// Ensure visible focus states
<button className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
```

---

## CSS Guidelines

### Border Radius

- Maximum `24px` for containers and cards
- Buttons can have larger radius if design calls for it

### Padding

- Ensure all elements maintain adequate inner padding
- Content should **never touch container edges**

```jsx
// Good
<div className="p-4 md:p-6 lg:p-8">

// Bad - no padding
<div className="p-0">
```

---

## Prohibited Designs

**NEVER do these (unless explicitly requested by user):**

- ❌ Include placeholder or broken links (`href="#"`)
- ❌ Draw SVGs inline with `<svg>` code
- ❌ Add decorative circles (static or animated)
- ❌ Use emojis
- ❌ Use text-shadow or box-shadow
- ❌ Use `max-width` less than 100rem (1600px)
- ❌ Use more than one `<h1>` per page

---

## Dynamic Compositions

### Challenge Predictability

Don't always default to left-aligned, standard layouts. Actively explore:

- **Right-aligned** content blocks
- **Centered** compositions
- **Asymmetrical** layouts
- **Mixed-alignment** structures within a page

### Examples

```jsx
// Right-aligned text block
<div className="ml-auto max-w-xl text-right">
  <h2 className="font-heading text-3xl">Right Aligned Title</h2>
  <p className="font-paragraph">Supporting text aligned right.</p>
</div>

// Centered with asymmetric image
<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
  <div className="lg:col-span-5 lg:col-start-2">
    <h2>Title</h2>
    <p>Content</p>
  </div>
  <div className="lg:col-span-4 lg:col-start-8">
    <Image src="..." alt="..." />
  </div>
</div>
```

---

## Media & Galleries

### Principles

- Be **generous** with the number of images used throughout
- Integrate media as **core design elements** that actively structure composition
- Images should enhance, not just decorate

### Gallery Patterns

```jsx
// Masonry-style grid
<div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
  {images.map(img => (
    <div key={img.id} className="mb-4 break-inside-avoid">
      <Image src={img.src} alt={img.alt} className="w-full rounded-lg" />
    </div>
  ))}
</div>

// Equal-height grid
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  {images.map(img => (
    <div key={img.id} className="aspect-square relative">
      <Image src={img.src} alt={img.alt} className="absolute inset-0 w-full h-full object-cover rounded-lg" />
    </div>
  ))}
</div>
```
