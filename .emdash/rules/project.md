# Project Structure

## File Locations
- **Pages**: `/src/components/pages/` - All page components
- **Components**: `/src/components/` - Reusable components
- **UI Components**: `/src/components/ui/` - shadcn/ui components
- **Router**: `/src/components/Router.tsx` - All routes defined here
- **Integrations**: `/src/integrations/` - Cart, auth, BaseCrudService

## Creating Pages
1. Create React component in `/src/components/pages/YourPage.tsx`
2. Add route to `Router.tsx`
3. Optionally add to Header navigation

## Routing
- Uses React Router - NEVER create .astro files
- All routes defined in Router.tsx

## Entities
- CMS collections defined in `src/entities/index.ts` (auto-generated)
- Do NOT create/edit files in `src/entities/` folder
- If a collection isn't in index.ts, it doesn't exist

## User Interface
- Users see live preview in iframe while you edit
- Use `Image` from `@/components/ui/image` (guaranteed to exist)
