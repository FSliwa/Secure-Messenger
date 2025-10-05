# SecureChat Landing Page

A modern, responsive landing page and registration form for SecureChat - an end-to-end encrypted messaging application. Built with React, TypeScript, and Tailwind CSS.

## Features

- 🔐 Security-focused messaging and design
- 📱 Fully responsive (mobile-first approach)
- ♿ Accessible (WCAG AA compliant)
- ⚡ Real-time form validation
- 🎨 Clean, Facebook-inspired design
- 🌙 Optimized for performance
- 🎯 SEO-ready with proper meta tags

## Quick Start

### Development
```bash
npm install
npm run dev
```

### Build for Production
```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── Header.tsx       # Sticky navigation header
│   ├── Hero.tsx         # Main hero section with branding
│   ├── SignUpCard.tsx   # Registration form with validation
│   ├── SecurityCallout.tsx  # Security messaging component
│   └── Footer.tsx       # Site footer with links
├── App.tsx              # Main application component
└── index.css            # Custom CSS with theme variables
```

## Customization Guide

### Changing Colors

All colors are defined using CSS custom properties in `src/index.css`. The theme uses OKLCH color space for better color consistency:

```css
:root {
  /* Primary brand color (blue) */
  --primary: oklch(0.45 0.15 250);
  
  /* Accent color for positive actions (green) */
  --accent: oklch(0.55 0.12 145);
  
  /* Background and text colors */
  --background: oklch(0.99 0 0);
  --foreground: oklch(0.15 0 0);
  
  /* Additional semantic colors */
  --success: oklch(0.55 0.12 145);
  --destructive: oklch(0.55 0.18 25);
}
```

### Changing Content

**Header Brand Name**: Edit `src/components/Header.tsx` line 13  
**Hero Title**: Edit `src/components/Hero.tsx` line 5  
**Hero Tagline**: Edit `src/components/Hero.tsx` line 8-10  
**Security Message**: Edit `src/components/SecurityCallout.tsx` lines 10-14  
**Form Title**: Edit `src/components/SignUpCard.tsx` line 110  

### Typography

The app uses Inter font family. To change:

1. Update Google Fonts link in `index.html`
2. Update font-family in `src/index.css`:

```css
body {
  font-family: 'YourFont', system-ui, -apple-system, sans-serif;
}
```

### Layout Breakpoints

- Mobile: `< 768px` (1 column layout)
- Desktop: `≥ 768px` (2 column layout)
- Container max-width: `1280px`

## Form Validation Rules

- **First/Last Name**: Required
- **Email**: Required, valid email format
- **Password**: Required, minimum 8 characters
- **Confirm Password**: Required, must match password
- **Terms**: Must be accepted

## Accessibility Features

- Semantic HTML landmarks (`header`, `main`, `footer`)
- Proper form labels and ARIA attributes
- Keyboard navigation support
- Screen reader announcements for form errors
- High contrast color ratios (WCAG AA)
- Reduced motion support

## Performance Optimizations

- Lazy loading for images
- Minimal font weights loaded
- CSS custom properties for theme switching
- Tree-shaken component imports
- Optimized animations with `prefers-reduced-motion`

## Browser Support

- Chrome 88+
- Firefox 86+
- Safari 14+
- Edge 88+

## Security Considerations

- No sensitive data logged to console
- Form data validation on both client and server side (client-side implemented)
- CSP-friendly (no inline styles or scripts)
- XSS protection through React's built-in escaping

## Deployment

The app is optimized for static hosting on platforms like:
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

Build artifacts are generated in the `dist/` folder after running `npm run build`.