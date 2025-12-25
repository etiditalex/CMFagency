# Changer Fusions - Marketing & Events Planning Platform

A comprehensive Next.js 14 application for event planning, marketing, and career development services.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Images**: Next.js Image Optimization
- **TypeScript**: Full type safety

## Features

### Home Page
- Hero section with animated background
- Featured events showcase
- Quick links to all platform sections
- Company introduction
- Latest news and updates
- Prominent call-to-action banners

### Events Section
- Dynamic event calendar with filtering
- Browse upcoming and past events
- Online booking forms for RSVP
- Detailed event pages with:
  - Schedules
  - Speaker bios
  - Vendor lists
  - Registration forms

### Portfolios Section
- Visual galleries showcasing:
  - Branding projects
  - Web design projects
  - Graphic design projects
- Custom project pages with:
  - Media galleries
  - Project descriptions
  - Client information
  - Deliverables

### Additional Pages
- About Us
- Contact Form
- Job Board

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── about/          # About page
│   ├── contact/        # Contact page
│   ├── events/         # Events listing and detail pages
│   ├── jobs/           # Job board
│   ├── portfolios/     # Portfolio gallery and detail pages
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/
│   ├── home/           # Home page components
│   ├── Footer.tsx      # Site footer
│   └── Navbar.tsx      # Navigation bar
└── public/             # Static assets
```

## Design Features

- Modern UI/UX with responsive design
- Mobile-first approach
- Smooth animations using Framer Motion
- Custom color palette extracted from logo
- Gradient backgrounds and effects
- Interactive components

## Build for Production

```bash
npm run build
npm start
```

## License

This project is proprietary and confidential.

